package textanalysis

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

type complaintRow struct {
	ID          string    `gorm:"column:id"`
	Title       string    `gorm:"column:title"`
	Description string    `gorm:"column:description"`
	Status      string    `gorm:"column:status"`
	CreatedAt   time.Time `gorm:"column:created_at"`
}

type damageRow struct {
	AssetID     uint   `gorm:"column:rusak_id"`
	Description string `gorm:"column:description"`
	Quantity    int64  `gorm:"column:qty_rusak"`
	Status      string `gorm:"column:status_rusak"`
}

func (r *Repository) GetRecords(
	ctx context.Context,
) ([]TextRecord, error) {
	var records []TextRecord

	// Ambil data keluhan.
	var complaints []complaintRow

	err := r.db.WithContext(ctx).
		Table("complaints").
		Select(`
			id::text AS id,
			COALESCE(title, '') AS title,
			COALESCE(description, '') AS description,
			COALESCE(status, '') AS status,
			created_at
		`).
		Order("created_at DESC").
		Scan(&complaints).Error

	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengambil data keluhan: %w",
			err,
		)
	}

	for _, item := range complaints {
		records = append(records, TextRecord{
			ID:          item.ID,
			Source:      "complaints",
			Title:       item.Title,
			Description: item.Description,
			Quantity:    0,
			Status:      item.Status,
			CreatedAt:   item.CreatedAt,
		})
	}

	// Ambil data kerusakan aset.
	// Ambil data kerusakan aset.
	var damages []damageRow

	err = r.db.WithContext(ctx).
		Table("asset_rusak").
		Select(`
		rusak_id,
		COALESCE(description, '') AS description,
		COALESCE(qty_rusak, 0) AS qty_rusak,
		status_rusak,
		create_at
	`).
		Order("create_at DESC").
		Scan(&damages).Error

	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengambil data kerusakan aset: %w",
			err,
		)
	}

	for _, item := range damages {
		statusLabel := "Tidak rusak"

		records = append(records, TextRecord{
			ID:          fmt.Sprintf("%d", item.AssetID),
			Source:      "damage",
			Title:       "Kerusakan Aset",
			Description: item.Description,
			Quantity:    item.Quantity,
			Status:      statusLabel,
		})
	}

	return records, nil
}
