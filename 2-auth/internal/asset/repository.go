package asset

import (
	"context"
	"strings"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// ExistsByCode mengecek kode aset yang masih aktif.
func (r *Repository) ExistsByCode(
	ctx context.Context,
	code string,
	excludeID uint,
) (bool, error) {
	var count int64

	query := r.db.WithContext(ctx).
		Model(&Asset{}).
		Where("LOWER(TRIM(code_asset)) = LOWER(?)", strings.TrimSpace(code)).
		Where("status = ?", true)

	if excludeID > 0 {
		query = query.Where("asset_id <> ?", excludeID)
	}

	if err := query.Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

// Create membuat aset baru.
func (r *Repository) Create(
	ctx context.Context,
	item *Asset,
) error {
	return r.db.WithContext(ctx).Create(item).Error
}

// List mengambil seluruh aset aktif beserta kategori dan lokasi.
func (r *Repository) List(
	ctx context.Context,
) ([]Asset, error) {
	var items []Asset

	err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Location").
		Where("status = ?", true).
		Order("asset_id DESC").
		Find(&items).Error

	return items, err
}

// GetByID mengambil detail satu aset.
func (r *Repository) GetByID(
	ctx context.Context,
	id uint,
) (*Asset, error) {
	var item Asset

	err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Location").
		Where("status = ?", true).
		First(&item, "asset_id = ?", id).Error

	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &item, nil
}

// Update memperbarui data aset.
func (r *Repository) Update(
	ctx context.Context,
	id uint,
	input *Asset,
) error {
	result := r.db.WithContext(ctx).
		Model(&Asset{}).
		Where("asset_id = ? AND status = ?", id, true).
		Updates(map[string]interface{}{
			"code_asset":  input.CodeAsset,
			"nama_asset":  input.NamaAsset,
			"category":    input.CategoryID,
			"location":    input.LocationID,
			"condition":   input.Condition,
			"status":      input.Status,
			"description": input.Description,
			"qty_in":      input.QtyIn,
			"update_at":   time.Now(),
		})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// Delete menggunakan soft delete.
func (r *Repository) Delete(
	ctx context.Context,
	id uint,
) error {
	result := r.db.WithContext(ctx).
		Model(&Asset{}).
		Where("asset_id = ? AND status = ?", id, true).
		Updates(map[string]interface{}{
			"status":    true,
			"update_at": time.Now(),
		})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}
