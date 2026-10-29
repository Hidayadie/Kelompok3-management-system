package assetbroken

import (
	"time"

	"gin-auth/internal/asset"
)

const (
	RusakRingan = "rusak_ringan"
	RusakSedang = "rusak_sedang"
	RusakBerat  = "rusak_berat"
)

type AssetRusak struct {
	RusakID   uint   `json:"rusak_id" gorm:"column:rusak_id;primaryKey;autoIncrement"`
	CodeRusak string `json:"code_rusak" gorm:"column:code_rusak;type:varchar(30);uniqueIndex;not null"`

	AssetID uint        `json:"asset_id" gorm:"column:asset_id;not null;index"`
	Asset   asset.Asset `json:"asset_detail" gorm:"foreignKey:AssetID;references:AssetID"`

	QtyRusak int    `json:"qty_rusak" gorm:"column:qty_rusak;not null;default:1"`
	Status   string `json:"status" gorm:"column:status;type:varchar(50);not null"`

	// true = tidak bisa diperbaiki / tidak worth it
	StatusRusak bool   `json:"status_rusak" gorm:"column:status_rusak;not null;default:false"`
	IsRepaired  bool   `json:"isRepaired" gorm:"column:is_repaired;not null;default:false"`
	Description string `json:"description" gorm:"type:text"`

	CreatedAt time.Time `json:"create_at" gorm:"column:create_at;autoCreateTime"`
	UpdatedAt time.Time `json:"update_at" gorm:"column:update_at;autoUpdateTime"`
}

func (AssetRusak) TableName() string {
	return "asset_rusak"
}
