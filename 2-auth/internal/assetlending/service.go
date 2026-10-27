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

func NewService(
	repo *Repository,
	assetRepo *asset.Repository,
	authRepo *auth.Repository,
) *Service {
	return &Service{
		repo:      repo,
		assetRepo: assetRepo,
		authRepo:  authRepo,
	}
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

// Create mencatat peminjaman baru dan otomatis mengurangi stok kuantitas aset.
func (s *Service) Create(
	ctx context.Context,
	input CreateLendingInput,
) (*LendingAsset, error) {
	if input.UserID == 0 || input.AssetID == 0 || input.QtyLending <= 0 {
		return nil, ErrInvalidInput
	}

	status := strings.TrimSpace(strings.ToLower(input.Status))
	if status == "" {
		status = StatusDipinjam
	}

	lendingDate := time.Now()
	if input.LendingDate != nil && !input.LendingDate.IsZero() {
		lendingDate = *input.LendingDate
	}

	// 1. Verifikasi User peminjam
	_, err := s.authRepo.GetByID(ctx, input.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("cek pengguna: %w", err)
	}

	// 2. Verifikasi Aset dan stok kuantitas
	targetAsset, err := s.assetRepo.GetByID(ctx, input.AssetID)
	if err != nil {
		return nil, err
	}
	if targetAsset == nil {
		return nil, ErrAssetNotFound
	}

	if targetAsset.QtyIn < input.QtyLending {
		return nil, fmt.Errorf("%w: sisa kuantitas aset saat ini hanya %d unit", ErrInsufficientStock, targetAsset.QtyIn)
	}

	item := &LendingAsset{
		UserID:      input.UserID,
		AssetID:     input.AssetID,
		QtyLending:  input.QtyLending,
		LendingDate: lendingDate,
		Status:      status,
	}

	// Gunakan transaksi agar pengurangan kuantitas aset dan penyimpanan pencatatan bersifat atomik
	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Kurangi stok aset
		if err := s.assetRepo.AdjustQty(ctx, tx, input.AssetID, -input.QtyLending); err != nil {
			return err
		}

		// Simpan record peminjaman
		if err := s.repo.Create(ctx, tx, item); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, item.LendingID)
}

// List mengambil seluruh data peminjaman aset.
func (s *Service) List(ctx context.Context) ([]LendingAsset, error) {
	return s.repo.List(ctx)
}

// GetByID mengambil detail satu transaksi peminjaman.
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

// ReturnAsset memproses pengembalian aset dan mengembalikan stok kuantitas ke aset terkait.
func (s *Service) ReturnAsset(
	ctx context.Context,
	id uint,
	input ReturnLendingInput,
) (*LendingAsset, error) {
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
		// Kembalikan kuantitas stok aset
		if err := s.assetRepo.AdjustQty(ctx, tx, current.AssetID, current.QtyLending); err != nil {
			return err
		}

		// Tandai peminjaman sebagai dikembalikan
		if err := s.repo.ReturnAsset(ctx, tx, id, returnDate); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, id)
}

// Update memperbarui data transaksi peminjaman.
func (s *Service) Update(
	ctx context.Context,
	id uint,
	input UpdateLendingInput,
) (*LendingAsset, error) {
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

	// Verifikasi User peminjam
	_, err = s.authRepo.GetByID(ctx, input.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("cek pengguna: %w", err)
	}

	// Verifikasi Aset
	targetAsset, err := s.assetRepo.GetByID(ctx, input.AssetID)
	if err != nil {
		return nil, err
	}
	if targetAsset == nil {
		return nil, ErrAssetNotFound
	}

	// Selisih kuantitas pinjam
	delta := input.QtyLending - current.QtyLending

	// Jika masih berstatus dipinjam dan kuantitas pinjam bertambah, cek sisa stok
	if current.Status != StatusDikembalikan && delta > 0 && targetAsset.QtyIn < delta {
		return nil, fmt.Errorf("%w: sisa kuantitas aset tidak cukup untuk penambahan %d unit pinjaman", ErrInsufficientStock, delta)
	}

	updated := &LendingAsset{
		UserID:      input.UserID,
		AssetID:     input.AssetID,
		QtyLending:  input.QtyLending,
		LendingDate: input.LendingDate,
		ReturnDate:  input.ReturnDate,
		Status:      strings.TrimSpace(strings.ToLower(input.Status)),
	}

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Jika saat ini belum dikembalikan dan ada perubahan kuantitas pinjam, sesuaikan stok
		if current.Status != StatusDikembalikan && delta != 0 {
			if err := s.assetRepo.AdjustQty(ctx, tx, input.AssetID, -delta); err != nil {
				return err
			}
		}

		if err := s.repo.Update(ctx, tx, id, updated); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, id)
}

// Delete membatalkan/menghapus record peminjaman dan mengembalikan kuantitas aset jika belum dikembalikan.
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
		// Jika belum berstatus dikembalikan, kembalikan stok aset
		if current.Status != StatusDikembalikan {
			if err := s.assetRepo.AdjustQty(ctx, tx, current.AssetID, current.QtyLending); err != nil {
				return err
			}
		}

		return s.repo.Delete(ctx, tx, id)
	})
}
