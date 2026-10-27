package assetbroken

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"gin-auth/internal/asset"

	"gorm.io/gorm"
)

var (
	ErrInvalidInput      = errors.New("data kerusakan aset tidak valid")
	ErrRecordNotFound    = errors.New("data kerusakan aset tidak ditemukan")
	ErrDuplicateCode     = errors.New("kode kerusakan sudah digunakan")
	ErrAssetNotFound     = errors.New("aset tidak ditemukan")
	ErrInsufficientStock = errors.New("stok kuantitas aset tidak mencukupi")
)

type Service struct {
	repo      *Repository
	assetRepo *asset.Repository
}

func NewService(repo *Repository, assetRepo *asset.Repository) *Service {
	return &Service{
		repo:      repo,
		assetRepo: assetRepo,
	}
}

type CreateAssetRusakInput struct {
	CodeRusak   string `json:"code_rusak" binding:"required"`
	AssetID     uint   `json:"asset_id" binding:"required,gt=0"`
	QtyRusak    int    `json:"qty_rusak" binding:"required,gt=0"`
	Status      string `json:"status" binding:"required"`
	StatusRusak bool   `json:"status_rusak"`
}

type UpdateAssetRusakInput struct {
	CodeRusak   string `json:"code_rusak" binding:"required"`
	AssetID     uint   `json:"asset_id" binding:"required,gt=0"`
	QtyRusak    int    `json:"qty_rusak" binding:"required,gt=0"`
	Status      string `json:"status" binding:"required"`
	StatusRusak bool   `json:"status_rusak"`
}

func normalizeCreateInput(input *CreateAssetRusakInput) {
	input.CodeRusak = strings.TrimSpace(input.CodeRusak)
	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
}

func normalizeUpdateInput(input *UpdateAssetRusakInput) {
	input.CodeRusak = strings.TrimSpace(input.CodeRusak)
	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
}

// Create mencatat aset rusak dan otomatis mengurangi qty_in pada tabel aset.
func (s *Service) Create(
	ctx context.Context,
	input CreateAssetRusakInput,
) (*AssetRusak, error) {
	normalizeCreateInput(&input)

	if input.CodeRusak == "" || input.AssetID == 0 || input.QtyRusak <= 0 || input.Status == "" {
		return nil, ErrInvalidInput
	}

	exists, err := s.repo.ExistsByCode(ctx, input.CodeRusak, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrDuplicateCode
	}

	// Cek ketersediaan aset dan stok qty_in
	targetAsset, err := s.assetRepo.GetByID(ctx, input.AssetID)
	if err != nil {
		return nil, err
	}
	if targetAsset == nil {
		return nil, ErrAssetNotFound
	}

	if targetAsset.QtyIn < input.QtyRusak {
		return nil, fmt.Errorf("%w: sisa kuantitas aset saat ini hanya %d unit", ErrInsufficientStock, targetAsset.QtyIn)
	}

	item := &AssetRusak{
		CodeRusak:   input.CodeRusak,
		AssetID:     input.AssetID,
		QtyRusak:    input.QtyRusak,
		Status:      input.Status,
		StatusRusak: input.StatusRusak,
	}

	// Gunakan transaksi agar pengurangan kuantitas aset dan penyimpanan pencatatan bersifat atomik
	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Kurangi stok aset
		if err := s.assetRepo.AdjustQty(ctx, tx, input.AssetID, -input.QtyRusak); err != nil {
			return err
		}

		// Simpan record aset rusak
		if err := s.repo.Create(ctx, tx, item); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, item.RusakID)
}

// List mengambil seluruh daftar aset rusak.
func (s *Service) List(ctx context.Context) ([]AssetRusak, error) {
	return s.repo.List(ctx)
}

// GetByID mengambil detail satu aset rusak berdasarkan ID.
func (s *Service) GetByID(ctx context.Context, id uint) (*AssetRusak, error) {
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

// Update memperbarui data kerusakan aset dan menyesuaikan kuantitas aset bila qty berubah.
func (s *Service) Update(
	ctx context.Context,
	id uint,
	input UpdateAssetRusakInput,
) (*AssetRusak, error) {
	if id == 0 {
		return nil, ErrInvalidInput
	}
	normalizeUpdateInput(&input)

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, ErrRecordNotFound
	}

	exists, err := s.repo.ExistsByCode(ctx, input.CodeRusak, id)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrDuplicateCode
	}

	targetAsset, err := s.assetRepo.GetByID(ctx, input.AssetID)
	if err != nil {
		return nil, err
	}
	if targetAsset == nil {
		return nil, ErrAssetNotFound
	}

	// Selisih penambahan kuantitas rusak
	delta := input.QtyRusak - current.QtyRusak

	// Jika kuantitas rusak bertambah, pastikan stok aset yang tersedia masih cukup
	if delta > 0 && targetAsset.QtyIn < delta {
		return nil, fmt.Errorf("%w: sisa kuantitas aset tidak cukup untuk penambahan %d unit rusak", ErrInsufficientStock, delta)
	}

	updated := &AssetRusak{
		CodeRusak:   input.CodeRusak,
		AssetID:     input.AssetID,
		QtyRusak:    input.QtyRusak,
		Status:      input.Status,
		StatusRusak: input.StatusRusak,
	}

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Jika kuantitas berubah, sesuaikan stok aset (jika delta > 0 kurangi stok, delta < 0 kembalikan stok)
		if delta != 0 {
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

// Delete menghapus data aset rusak dan mengembalikan kuantitas aset yang sebelumnya tercatat rusak.
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
		// Kembalikan stok aset
		if err := s.assetRepo.AdjustQty(ctx, tx, current.AssetID, current.QtyRusak); err != nil {
			return err
		}

		return s.repo.Delete(ctx, tx, id)
	})
}
