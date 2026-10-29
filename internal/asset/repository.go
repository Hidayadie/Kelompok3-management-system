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

// List mengambil seluruh aset aktif beserta kategori dan lokasi, dengan agregasi qty rusak dan dipinjam.
func (r *Repository) List(
	ctx context.Context,
) ([]AssetWithQty, error) {
	var assets []Asset

	err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Location").
		Where("status = ?", true).
		Order("asset_id DESC").
		Find(&assets).Error
	if err != nil {
		return nil, err
	}

	if len(assets) == 0 {
		return []AssetWithQty{}, nil
	}

	assetIDs := make([]uint, len(assets))
	for i, a := range assets {
		assetIDs[i] = a.AssetID
	}

	type qtyResult struct {
		AssetID uint `gorm:"column:asset_id"`
		Total   int  `gorm:"column:total"`
	}

	// 1. Hitung qty_dipinjam dari lending_assets (hanya status dipinjam dan terlambat)
	var lendingResults []qtyResult
	err = r.db.WithContext(ctx).
		Table("lending_assets").
		Select("asset_id, COALESCE(SUM(qty_lending), 0) as total").
		Where("asset_id IN ? AND lending_status IN ?", assetIDs, []string{"dipinjam", "terlambat"}).
		Group("asset_id").
		Scan(&lendingResults).Error
	if err != nil {
		return nil, err
	}

	lendingMap := make(map[uint]int, len(lendingResults))
	for _, lr := range lendingResults {
		lendingMap[lr.AssetID] = lr.Total
	}

	// 2. Hitung qty_rusak dari asset_rusak
	var rusakResults []qtyResult
	err = r.db.WithContext(ctx).
		Table("asset_rusak").
		Select("asset_id, COALESCE(SUM(qty_rusak), 0) as total").
		Where("asset_id IN ?", assetIDs).
		Group("asset_id").
		Scan(&rusakResults).Error
	if err != nil {
		return nil, err
	}

	rusakMap := make(map[uint]int, len(rusakResults))
	for _, rr := range rusakResults {
		rusakMap[rr.AssetID] = rr.Total
	}

	items := make([]AssetWithQty, len(assets))
	for i, a := range assets {
		items[i] = AssetWithQty{
			Asset:       a,
			QtyRusak:    rusakMap[a.AssetID],
			QtyDipinjam: lendingMap[a.AssetID],
		}
	}

	return items, nil
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
			"status":    false,
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

// GetDB mengembalikan instance gorm.DB untuk transaksi.
func (r *Repository) GetDB() *gorm.DB {
	return r.db
}
// AdjustQty menambah atau mengurangi kuantitas aset secara atomik.
func (r *Repository) AdjustQty(
	ctx context.Context,
	tx *gorm.DB,
	assetID uint,
	delta int,
) error {
	db := r.db
	if tx != nil {
		db = tx
	}

	return db.WithContext(ctx).
		Model(&Asset{}).
		Where("asset_id = ? AND status = ?", assetID, true).
		Update("qty_in", gorm.Expr("qty_in + ?", delta)).Error
}
