package dashboard

type Summary struct {
	TotalAssets       int64 `json:"total_assets"`
	AvailableAssets   int64 `json:"available_assets"`
	BorrowedAssets    int64 `json:"borrowed_assets"`
	NeedsRepair       int64 `json:"needs_repair"`
	RusakCantRepaired int64 `json:"rusak_cantRepaired"`

	ConditionSummary ConditionSummary `json:"condition_summary"`
	RecentAssets     []RecentAsset    `json:"recent_assets"`
}

type ConditionSummary struct {
	Total       int64 `json:"total"`
	Good        int64 `json:"good"`
	Maintenance int64 `json:"maintenance"`
	Damaged     int64 `json:"damaged"`
}

type RecentAsset struct {
	AssetID   int64  `json:"asset_id" gorm:"column:asset_id"`
	CodeAsset string `json:"code_asset" gorm:"column:code_asset"`
	NamaAsset string `json:"nama_asset" gorm:"column:nama_asset"`
	Category  int64  `json:"category" gorm:"column:category"`
	Condition string `json:"condition" gorm:"column:condition"`
	Status    bool   `json:"status" gorm:"column:status"`
	QtyIn     int64  `json:"qty_in" gorm:"column:qty_in"`
}

// LastAsset menggunakan struktur data yang sama dengan RecentAsset.
type LastAsset = RecentAsset
