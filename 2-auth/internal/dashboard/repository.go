package dashboard

import (
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

type Summary struct {
	TotalAssets     int64 `json:"total_assets"`
	AvailableAssets int64 `json:"available_assets"`
	BorrowedAssets  int64 `json:"borrowed_assets"`
	NeedsRepair     int64 `json:"needs_repair"`

	ConditionSummary ConditionSummary `json:"condition_summary"`
	RecentAssets     []RecentAsset    `json:"recent_assets"`
}

type ConditionSummary struct {
	Good        int64 `json:"good"`
	Maintenance int64 `json:"maintenance"`
	Damaged     int64 `json:"damaged"`
}

type RecentAsset struct {
	ID        string    `json:"id"`
	AssetCode string    `json:"asset_code"`
	Name      string    `json:"name"`
	Category  string    `json:"category"`
	Condition string    `json:"condition"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func (r *Repository) GetSummary() (*Summary, error) {
	var result Summary

	// Total aset
	if err := r.db.Table("assets").
		Count(&result.TotalAssets).Error; err != nil {
		return nil, err
	}

	// Jumlah berdasarkan status.
	if err := r.db.Table("assets").
		Where("LOWER(status) = ?", "tersedia").
		Count(&result.AvailableAssets).Error; err != nil {
		return nil, err
	}

	if err := r.db.Table("assets").
		Where("LOWER(status) = ?", "dipinjam").
		Count(&result.BorrowedAssets).Error; err != nil {
		return nil, err
	}

	// Kondisi aset.
	if err := r.db.Table("assets").
		Where("LOWER(condition) = ?", "baik").
		Count(&result.ConditionSummary.Good).Error; err != nil {
		return nil, err
	}

	if err := r.db.Table("assets").
		Where("LOWER(condition) = ?", "service").
		Count(&result.ConditionSummary.Maintenance).Error; err != nil {
		return nil, err
	}

	if err := r.db.Table("assets").
		Where("LOWER(condition) = ?", "rusak").
		Count(&result.ConditionSummary.Damaged).Error; err != nil {
		return nil, err
	}

	// Kartu perlu perbaikan.
	result.NeedsRepair = result.ConditionSummary.Maintenance +
		result.ConditionSummary.Damaged

	// Inventaris terbaru.
	result.RecentAssets = make([]RecentAsset, 0)

	err := r.db.Table("assets AS a").
		Select(`
			a.asset_id,
			a.code_asset,
			a.nama_asset,
			COALESCE(c.name, '') AS category,
			a.condition,
			a.status,
			a.created_at
		`).
		Joins("LEFT JOIN categories c ON c.id = a.category").
		Order("a.asset_id DESC").
		Limit(5).
		Scan(&result.RecentAssets).Error

	if err != nil {
		return nil, err
	}

	return &result, nil
}
