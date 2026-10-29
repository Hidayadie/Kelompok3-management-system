package complaint

import (
	"time"

	"gin-auth/internal/asset"
	"gin-auth/internal/auth"

	// Tambahkan package model User sesuai struktur proyek.

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Complaint struct {
	ID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Code    string    `gorm:"type:varchar(30);uniqueIndex;not null" json:"code"`
	UserID  uint      `gorm:"not null;index" json:"userID"`
	AssetID uint      `gorm:"not null;index" json:"assetID"`

	// Relasi aset

	Asset asset.Asset `gorm:"foreignKey:AssetID;references:AssetID" json:"asset"`

	// Relasi User perlu disesuaikan dengan model User proyek Anda.

	Title       string    `gorm:"type:varchar(200);not null" json:"title"`
	Description string    `gorm:"type:text;not null" json:"description"`
	Priority    float64   `gorm:"not null;default:0" json:"priority"`
	Status      string    `gorm:"type:varchar(30);not null;default:'low'" json:"status"`
	Note        string    `gorm:"type:text" json:"note"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	IsFixed     bool      `gorm:"not null;default:false" json:"is_fixed"`
	ImagePath   string    `gorm:"type:text" json:"image_path,omitempty"`
	User        auth.User `gorm:"foreignKey:UserID;references:ID" json:"user"`
}

func (c *Complaint) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
