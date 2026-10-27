package assetlending

import (
	"time"

	"gin-auth/internal/asset"
	"gin-auth/internal/auth"
)

const (
	StatusDipinjam     = "dipinjam"
	StatusDikembalikan = "dikembalikan"
	StatusTerlambat    = "terlambat"
)

type LendingAsset struct {
	LendingID uint `json:"lending_id" gorm:"column:lending_id;primaryKey;autoIncrement"`

	UserID uint      `json:"user_id" gorm:"column:user_id;not null;index"`
	User   auth.User `json:"user_detail" gorm:"foreignKey:UserID;references:ID"`

	AssetID uint        `json:"asset_id" gorm:"column:asset_id;not null;index"`
	Asset   asset.Asset `json:"asset_detail" gorm:"references:AssetID"`

	QtyLending int `json:"qty_lending" gorm:"column:qty_lending;not null;default:1"`

	LendingDate time.Time  `json:"lending_date" gorm:"column:lending_date;not null"`
	ReturnDate  *time.Time `json:"lending_return" gorm:"column:lending_return"` // nil = belum dikembalikan

	Status string `json:"lending_status" gorm:"column:lending_status;type:varchar(50);not null;default:'dipinjam'"`
}

func (LendingAsset) TableName() string {
	return "lending_assets"
}
