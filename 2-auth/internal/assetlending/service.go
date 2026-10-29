package assetlending

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gin-auth/internal/asset"
	"gin-auth/internal/auth"

	"gorm.io/gorm"
)

var (
	ErrInvalidInput      = errors.New("data peminjaman tidak valid")
	ErrRecordNotFound    = errors.New("data peminjaman tidak ditemukan")
	ErrAssetNotFound     = errors.New("aset tidak ditemukan")
	ErrUserNotFound      = errors.New("pengguna peminjam tidak ditemukan")
	ErrInsufficientStock = errors.New("stok kuantitas aset tidak mencukupi untuk dipinjam")
	ErrAlreadyReturned   = errors.New("aset pada peminjaman ini sudah dikembalikan sebelumnya")
)

type Service struct {
	repo      *Repository
	assetRepo *asset.Repository
	authRepo  *auth.Repository
}

func NewService(repo *Repository, assetRepo *asset.Repository, authRepo *auth.Repository) *Service {
	return &Service{repo: repo, assetRepo: assetRepo, authRepo: authRepo}
}

type CreateLendingInput struct {
	UserID      uint       `json:"user_id" binding:"required,gt=0"`
	AssetID     uint       `json:"asset_id" binding:"required,gt=0"`
	QtyLending  int        `json:"qty_lending" binding:"required,gt=0"`
	LendingDate *time.Time `json:"lending_date"`
	Status      string     `json:"lending_status"`
}

type UpdateLendingInput struct {
	UserID      uint       `json:"user_id" binding:"required,gt=0"`
	AssetID     uint       `json:"asset_id" binding:"required,gt=0"`
	QtyLending  int        `json:"qty_lending" binding:"required,gt=0"`
	LendingDate time.Time  `json:"lending_date" binding:"required"`
	ReturnDate  *time.Time `json:"lending_return"`
	Status      string     `json:"lending_status" binding:"required"`
}

type ReturnLendingInput struct {
	ReturnDate *time.Time `json:"return_date"`
}

func normalizeStatus(raw string, allowReturned bool) (string, error) {
	status := strings.ToLower(strings.TrimSpace(raw))
	if status == "" {
		status = StatusDipinjam
	}
	switch status {
	case StatusDipinjam, StatusTerlambat:
		return status, nil
	case StatusDikembalikan:
		if allowReturned {
			return status, nil
		}
	}
	return "", ErrInvalidInput
}

func (s *Service) validateUser(ctx context.Context, id uint) error {
	_, err := s.authRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrUserNotFound
		}
		return fmt.Errorf("cek pengguna: %w", err)
	}

	return nil
}
func (s *Service) getAsset(ctx context.Context, id uint) (*asset.Asset, error) {
	item, err := s.assetRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}
	if item == nil {
		return nil, ErrAssetNotFound
	}
	return item, nil
}

func (s *Service) Create(ctx context.Context, input CreateLendingInput) (*LendingAsset, error) {
	if input.UserID == 0 || input.AssetID == 0 || input.QtyLending <= 0 {
		return nil, ErrInvalidInput
	}
	status, err := normalizeStatus(input.Status, false)
	if err != nil {
		return nil, err
	}
	if err := s.validateUser(ctx, input.UserID); err != nil {
		return nil, err
	}
	if _, err := s.getAsset(ctx, input.AssetID); err != nil {
		return nil, err
	}

	lendingDate := time.Now()
	if input.LendingDate != nil && !input.LendingDate.IsZero() {
		lendingDate = *input.LendingDate
	}
	item := &LendingAsset{UserID: input.UserID, AssetID: input.AssetID, QtyLending: input.QtyLending, LendingDate: lendingDate, Status: status}

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// AdjustQty harus menolak hasil stok negatif agar dua peminjaman bersamaan tidak menghabiskan stok.
		if err := s.assetRepo.AdjustQty(ctx, tx, input.AssetID, -input.QtyLending); err != nil {
			return err
		}
		return s.repo.Create(ctx, tx, item)
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, item.LendingID)
}

func (s *Service) List(ctx context.Context) ([]LendingAsset, error) { return s.repo.List(ctx) }

func (s *Service) GetByID(ctx context.Context, id uint) (*LendingAsset, error) {
	if id == 0 {
		return nil, ErrInvalidInput
	}
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, ErrRecordNotFound
	}
	return item, nil
}

func (s *Service) ReturnAsset(ctx context.Context, id uint, input ReturnLendingInput) (*LendingAsset, error) {
	if id == 0 {
		return nil, ErrInvalidInput
	}
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, ErrRecordNotFound
	}
	if current.Status == StatusDikembalikan {
		return nil, ErrAlreadyReturned
	}

	returnDate := time.Now()
	if input.ReturnDate != nil && !input.ReturnDate.IsZero() {
		returnDate = *input.ReturnDate
	}
	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Update status bersyarat di bawah; jika sudah dikembalikan oleh request lain,
		// error menyebabkan penambahan stok di transaksi ini ikut rollback.
		if err := s.repo.ReturnAsset(ctx, tx, id, returnDate); err != nil {
			return err
		}
		return s.assetRepo.AdjustQty(ctx, tx, current.AssetID, current.QtyLending)
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Update(ctx context.Context, id uint, input UpdateLendingInput) (*LendingAsset, error) {
	if id == 0 || input.UserID == 0 || input.AssetID == 0 || input.QtyLending <= 0 || input.LendingDate.IsZero() {
		return nil, ErrInvalidInput
	}
	status, err := normalizeStatus(input.Status, true)
	if err != nil {
		return nil, err
	}
	if status == StatusDikembalikan && input.ReturnDate == nil {
		return nil, ErrInvalidInput
	}
	if status != StatusDikembalikan && input.ReturnDate != nil {
		return nil, ErrInvalidInput
	}

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, ErrRecordNotFound
	}
	if err := s.validateUser(ctx, input.UserID); err != nil {
		return nil, err
	}
	if _, err := s.getAsset(ctx, input.AssetID); err != nil {
		return nil, err
	}

	updated := &LendingAsset{UserID: input.UserID, AssetID: input.AssetID, QtyLending: input.QtyLending,
		LendingDate: input.LendingDate, ReturnDate: input.ReturnDate, Status: status}
	oldActive := current.Status != StatusDikembalikan
	newActive := status != StatusDikembalikan

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		sameAsset := current.AssetID == input.AssetID
		switch {
		case oldActive && newActive && sameAsset:
			// Stok sudah berkurang sebesar qty lama; sesuaikan hanya selisihnya.
			delta := input.QtyLending - current.QtyLending
			if delta != 0 {
				if err := s.assetRepo.AdjustQty(ctx, tx, input.AssetID, -delta); err != nil {
					return err
				}
			}
		case oldActive && newActive && !sameAsset:
			if err := s.assetRepo.AdjustQty(ctx, tx, current.AssetID, current.QtyLending); err != nil {
				return err
			}
			if err := s.assetRepo.AdjustQty(ctx, tx, input.AssetID, -input.QtyLending); err != nil {
				return err
			}
		case oldActive && !newActive:
			if err := s.assetRepo.AdjustQty(ctx, tx, current.AssetID, current.QtyLending); err != nil {
				return err
			}
		case !oldActive && newActive:
			if err := s.assetRepo.AdjustQty(ctx, tx, input.AssetID, -input.QtyLending); err != nil {
				return err
			}
		}
		return s.repo.Update(ctx, tx, id, updated)
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Delete(ctx context.Context, id uint) error {
	if id == 0 {
		return ErrInvalidInput
	}
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if current == nil {
		return ErrRecordNotFound
	}
	return s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if current.Status != StatusDikembalikan {
			if err := s.assetRepo.AdjustQty(ctx, tx, current.AssetID, current.QtyLending); err != nil {
				return err
			}
		}
		return s.repo.Delete(ctx, tx, id)
	})
}
