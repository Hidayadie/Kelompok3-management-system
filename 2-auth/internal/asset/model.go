package asset

import (
	"time"

	"gin-auth/internal/category"
	"gin-auth/internal/location"

	"github.com/google/uuid"
)

type Asset struct {
	AssetID   uint   `json:"asset_id" gorm:"column:asset_id;primaryKey;autoIncrement"`
	CodeAsset string `json:"code_asset" gorm:"column:code_asset;not null"`
	NamaAsset string `json:"nama_asset" gorm:"column:nama_asset;not null"`

	CategoryID uint              `json:"category" gorm:"column:category;not null"`
	Category   category.Category `json:"category_detail" gorm:"foreignKey:CategoryID;references:ID"`

	LocationID uuid.UUID         `json:"location" gorm:"column:location;type:uuid;not null"`
	Location   location.Location `json:"location_detail" gorm:"foreignKey:LocationID;references:ID"`

	Condition   string    `json:"condition" gorm:"column:condition;type:kondisi"`
	Status      bool      `json:"status" gorm:"column:status"`
	Description string    `json:"description" gorm:"column:description"`
	QtyIn       int       `json:"qty_in" gorm:"column:qty_in"`
	UpdateAt    time.Time `json:"update_at" gorm:"column:update_at;autoUpdateTime"`
	CreatedAt   bool      `json:"create_at" gorm:"column:update_at;autoUpdateTime"`
}

func (Asset) TableName() string {
	return "assets"
}
