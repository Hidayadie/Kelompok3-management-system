package assetbroken

import (
	"context"
	"strings"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetDB() *gorm.DB {
	return r.db
}

// ExistsByCode mengecek apakah kode kerusakan sudah pernah digunakan.
func (r *Repository) ExistsByCode(
	ctx context.Context,
	code string,
	excludeID uint,
) (bool, error) {
	var count int64
	query := r.db.WithContext(ctx).
		Model(&AssetRusak{}).
		Where("LOWER(TRIM(code_rusak)) = LOWER(?)", strings.TrimSpace(code))

	if excludeID > 0 {
		query = query.Where("rusak_id <> ?", excludeID)
	}

	if err := query.Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

// Create menyimpan data aset rusak baru.
func (r *Repository) Create(
	ctx context.Context,
	tx *gorm.DB,
	item *AssetRusak,
) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(item).Error

}

// List mengambil seluruh data aset rusak beserta detail aset, kategori, dan lokasi.
func (r *Repository) List(
	ctx context.Context,
) ([]AssetRusak, error) {
	var items []AssetRusak

	err := r.db.WithContext(ctx).
		Preload("Asset").
		Preload("Asset.Category").
		Preload("Asset.Location").
		Order("rusak_id DESC").
		Find(&items).Error

	return items, err
}

// GetByID mengambil detail satu record kerusakan aset.
func (r *Repository) GetByID(
	ctx context.Context,
	id uint,
) (*AssetRusak, error) {
	var item AssetRusak

	err := r.db.WithContext(ctx).
		Preload("Asset").
		Preload("Asset.Category").
		Preload("Asset.Location").
		First(&item, "rusak_id = ?", id).Error

	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &item, nil
}

// Update memperbarui data kerusakan aset.
func (r *Repository) Update(
	ctx context.Context,
	tx *gorm.DB,
	id uint,
	input *AssetRusak,
) error {
	db := r.db
	if tx != nil {
		db = tx
	}

	result := db.WithContext(ctx).
		Model(&AssetRusak{}).
		Where("rusak_id = ?", id).
		Updates(map[string]interface{}{
			"code_rusak":   input.CodeRusak,
			"asset_id":     input.AssetID,
			"qty_rusak":    input.QtyRusak,
			"status":       input.Status,
			"status_rusak": input.StatusRusak,
			"is_repaired":  input.IsRepaired,
			"description":  input.Description,
		})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// Delete menghapus record kerusakan aset.
func (r *Repository) Delete(
	ctx context.Context,
	tx *gorm.DB,
	id uint,
) error {
	db := r.db
	if tx != nil {
		db = tx
	}

	result := db.WithContext(ctx).
		Where("rusak_id = ?", id).
		Delete(&AssetRusak{})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}
