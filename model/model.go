package model

import "time"

const JsonFileAssets = "data/assets.json"

type Location struct {
	LocationID   int    `json:"locationID"`
	NamaLocation string `json:"namaLocation"`
	Jenis        string `json:"jenis"`
}
type Category struct {
	CategoryID   int    `json:"categoryID"`
	NameCategory string `json:"nameCategory"`
}

type Asset struct {
	AsetID      int        `json:"asetID"`
	CodeAset    string     `json:"codeAset"`
	NameAsset   string     `json:"nameAsset"`
	Categorys   []Category `json:"categorys"`
	Locations   []Location `json:"locations"`
	Condition   string     `json:"condition"`
	Status      bool       `json:"status"`
	Description string     `json:"description"`
	QtyIn       int        `json:"qtyIn"`
	QtyOut      int        `json:"qtyOut"`
	QtyReal     int        `json:"qtyReal"`
	UpdateAt    time.Time  `json:"updateAt"`
}
