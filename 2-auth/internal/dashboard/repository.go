package dashboard

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

// GetSummary mengambil statistik dashboard.
func (r *Repository) GetSummary(
	ctx context.Context,
) (*Summary, error) {
	var result Summary

	db := r.db.WithContext(ctx)

	// 1. Total seluruh unit aset.
	err := db.Table("assets").
		Where("is_deleted = ?", false).
		Select("COALESCE(SUM(qty_in), 0)").
		Scan(&result.TotalAssets).Error
	if err != nil {
		return nil, err
	}

	// 2. Total unit aset berstatus tersedia.
	err = db.Table("assets").
		Where("is_deleted = ?", false).
		Where("status = ?", true).
		Select("COALESCE(SUM(qty_in), 0)").
		Scan(&result.AvailableAssets).Error
	if err != nil {
		return nil, err
	}

	// 3. Total unit aset yang sedang dipinjam.
	err = db.Table("lending_assets").
		Where(
			"LOWER(lending_status) NOT IN ?",
			[]string{
				"dikembalikan",
				"selesai",
				"dibatalkan",
			},
		).
		Select("COALESCE(SUM(qty_lending), 0)").
		Scan(&result.BorrowedAssets).Error
	if err != nil {
		return nil, err
	}

	// 4. Unit rusak yang masih bisa diperbaiki.
	err = db.Table("asset_rusak AS ar").
		Joins("JOIN assets AS a ON a.asset_id = ar.asset_id").
		Where("a.is_deleted = ?", false).
		Where("ar.is_repaired = ?", true).
		Select("COALESCE(SUM(ar.qty_rusak), 0)").
		Scan(&result.NeedsRepair).Error
	if err != nil {
		return nil, err
	}

	// 5. Unit rusak yang tidak bisa diperbaiki.
	err = db.Table("asset_rusak AS ar").
		Joins("JOIN assets AS a ON a.asset_id = ar.asset_id").
		Where("a.is_deleted = ?", false).
		Where("ar.is_repaired = ?", false).
		Select("COALESCE(SUM(ar.qty_rusak), 0)").
		Scan(&result.RusakCantRepaired).Error
	if err != nil {
		return nil, err
	}

	// 6. Ringkasan kondisi aset berdasarkan qty_in.
	var conditionRows []struct {
		Condition string `gorm:"column:condition"`
		Total     int64  `gorm:"column:total"`
	}

	err = db.Table("assets").
		Select("condition, COALESCE(SUM(qty_in), 0) AS total").
		Where("is_deleted = ?", false).
		Group("condition").
		Scan(&conditionRows).Error
	if err != nil {
		return nil, err
	}

	var good, maintenance, damaged int64

	for _, row := range conditionRows {
		switch strings.ToLower(strings.TrimSpace(row.Condition)) {
		case "baik":
			good += row.Total

		case "perawatan", "maintenance":
			maintenance += row.Total

		case "rusak", "damaged":
			damaged += row.Total
		}
	}

	result.ConditionSummary = ConditionSummary{
		Total:       good + maintenance + damaged,
		Good:        good,
		Maintenance: maintenance,
		Damaged:     damaged,
	}

	// 7. Lima aset terbaru untuk summary.
	var recentAssets []RecentAsset

	err = db.Table("assets").
		Select(`
			asset_id,
			code_asset,
			nama_asset,
			category,
			condition,
			status,
			qty_in
		`).
		Where("is_deleted = ?", false).
		Order("update_at DESC").
		Limit(5).
		Scan(&recentAssets).Error
	if err != nil {
		return nil, err
	}

	result.RecentAssets = recentAssets

	return &result, nil
}

// GetLastAssets mengambil daftar aset terbaru secara terpisah.
func (r *Repository) GetLastAssets(
	ctx context.Context,
	limit int,
) ([]LastAsset, error) {
	var assets []LastAsset

	if limit <= 0 {
		limit = 5
	}

	err := r.db.WithContext(ctx).
		Table("assets").
		Select(`
			asset_id,
			code_asset,
			nama_asset,
			category,
			condition,
			status,
			qty_in
		`).
		Where("is_deleted = ?", false).
		Order("update_at DESC").
		Limit(limit).
		Scan(&assets).Error
	if err != nil {
		return nil, err
	}

	return assets, nil
}
