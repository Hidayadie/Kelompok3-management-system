package assetlending

import (
	"context"
	"time"

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

// Create menyimpan data peminjaman aset baru.
func (r *Repository) Create(
	ctx context.Context,
	tx *gorm.DB,
	item *LendingAsset,
) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(item).Error
}

// List mengambil seluruh data transaksi peminjaman aset.
func (r *Repository) List(
	ctx context.Context,
) ([]LendingAsset, error) {
	var items []LendingAsset

	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Asset").
		Preload("Asset.Category").
		Preload("Asset.Location").
		Order("lending_id DESC").
		Find(&items).Error

	return items, err
}

// GetByID mengambil detail satu transaksi peminjaman berdasarkan ID.
func (r *Repository) GetByID(
	ctx context.Context,
	id uint,
) (*LendingAsset, error) {
	var item LendingAsset

	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Asset").
		Preload("Asset.Category").
		Preload("Asset.Location").
		First(&item, "lending_id = ?", id).Error

	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &item, nil
}

// Update memperbarui data peminjaman aset.
func (r *Repository) Update(
	ctx context.Context,
	tx *gorm.DB,
	id uint,
	input *LendingAsset,
) error {
	db := r.db
	if tx != nil {
		db = tx
	}

	updates := map[string]interface{}{
		"user_id":        input.UserID,
		"asset_id":       input.AssetID,
		"qty_lending":    input.QtyLending,
		"lending_date":   input.LendingDate,
		"lending_status": input.Status,
	}
	if input.ReturnDate != nil {
		updates["lending_return"] = input.ReturnDate
	}

	result := db.WithContext(ctx).
		Model(&LendingAsset{}).
		Where("lending_id = ?", id).
		Updates(updates)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// ReturnAsset menandai aset telah dikembalikan dan mencatat waktu pengembalian.
func (r *Repository) ReturnAsset(
	ctx context.Context,
	tx *gorm.DB,
	id uint,
	returnDate time.Time,
) error {
	db := r.db
	if tx != nil {
		db = tx
	}

	result := db.WithContext(ctx).
		Model(&LendingAsset{}).
		Where("lending_id = ?", id).
		Updates(map[string]interface{}{
			"lending_return": returnDate,
			"lending_status": StatusDikembalikan,
		})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

// Delete menghapus data peminjaman aset.
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
		Where("lending_id = ?", id).
		Delete(&LendingAsset{})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}
