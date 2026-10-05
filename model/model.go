// Package model hanya berisi definisi data dan aturan yang tidak butuh I/O.
// Package ini tidak mengimpor package lain dari project, jadi tidak mungkin
// terjadi import melingkar.
package model

import (
	"errors"
	"fmt"
	"math"
	"slices"
	"strings"
	"time"
)

// ======================= DATA =======================

type Complaint struct {
	ID          int     `json:"id"`
	Code        string  `json:"code"`
	UserID      int     `json:"userID"`
	AssetID     int     `json:"assetID"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Priority    float64 `json:"priority"`
	Status      string  `json:"status"`
	Note        string  `json:"note"`
}

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Category struct {
	CategoryID   int    `json:"categoryID"`
	NameCategory string `json:"nameCategory"`
}

type Location struct {
	LocationID   int    `json:"locationID"`
	NamaLocation string `json:"namaLocation"`
	Jenis        string `json:"jenis"`
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

// AssetInput adalah isian untuk membuat aset baru (dari form maupun body JSON).
// ID, kategori lengkap, lokasi lengkap, dan qty lain dibuat oleh server.
type AssetInput struct {
	CodeAset    string `json:"codeAset"`
	NameAsset   string `json:"nameAsset"`
	CategoryID  int    `json:"categoryID"`
	LocationID  int    `json:"locationID"`
	Condition   string `json:"condition"`
	Status      bool   `json:"status"`
	Description string `json:"description"`
	QtyIn       int    `json:"qtyIn"`
}

// ======================= DAFTAR PILIHAN =======================

// Satu sumber kebenaran: dipakai untuk validasi sekaligus untuk mengisi <select> di template.
var (
	Statuses   = []string{"urgent", "high", "middle", "low"}
	Conditions = []string{"Baik", "Rusak Ringan", "Rusak Berat"}

	Categories = []Category{
		{CategoryID: 1, NameCategory: "Perangkat Komputer"},
		{CategoryID: 2, NameCategory: "Perangkat Jaringan"},
		{CategoryID: 3, NameCategory: "Perangkat Elektronik"},
	}
	Locations = []Location{
		{LocationID: 1, NamaLocation: "Ruang IT", Jenis: "Ruangan"},
		{LocationID: 2, NamaLocation: "Ruang Administrasi", Jenis: "Ruangan"},
		{LocationID: 3, NamaLocation: "Ruang Dosen", Jenis: "Ruangan"},
	}
)

func FindCategory(id int) (Category, bool) {
	i := slices.IndexFunc(Categories, func(c Category) bool { return c.CategoryID == id })
	if i < 0 {
		return Category{}, false
	}
	return Categories[i], true
}

func FindLocation(id int) (Location, bool) {
	i := slices.IndexFunc(Locations, func(l Location) bool { return l.LocationID == id })
	if i < 0 {
		return Location{}, false
	}
	return Locations[i], true
}

// ======================= ATURAN: COMPLAINT =======================

// Normalize merapikan spasi di field teks.
func (c *Complaint) Normalize() {
	c.Title = strings.TrimSpace(c.Title)
	c.Description = strings.TrimSpace(c.Description)
	c.Note = strings.TrimSpace(c.Note)
}

// Validate memeriksa aturan yang hanya butuh isi struct itu sendiri.
// Pemeriksaan "user/asset ada atau tidak" ada di store.
func (c Complaint) Validate() error {
	switch {
	case c.UserID <= 0:
		return errors.New("User wajib dipilih.")
	case c.AssetID <= 0:
		return errors.New("Asset wajib dipilih.")
	case strings.TrimSpace(c.Title) == "":
		return errors.New("Judul wajib diisi.")
	case strings.TrimSpace(c.Description) == "":
		return errors.New("Deskripsi wajib diisi.")
	case math.IsNaN(c.Priority) || math.IsInf(c.Priority, 0) || c.Priority < 0:
		return errors.New("Prioritas harus berupa angka (0 atau lebih).")
	case !slices.Contains(Statuses, c.Status):
		return fmt.Errorf("Status tidak valid. Gunakan: %s.", strings.Join(Statuses, ", "))
	}
	return nil
}

// ======================= ATURAN: ASSET =======================

func (in AssetInput) Validate() error {
	_, okCat := FindCategory(in.CategoryID)
	_, okLoc := FindLocation(in.LocationID)

	switch {
	case strings.TrimSpace(in.CodeAset) == "":
		return errors.New("Kode aset wajib diisi.")
	case strings.TrimSpace(in.NameAsset) == "":
		return errors.New("Nama aset wajib diisi.")
	case !okCat:
		return errors.New("Kategori tidak valid.")
	case !okLoc:
		return errors.New("Lokasi tidak valid.")
	case !slices.Contains(Conditions, in.Condition):
		return errors.New("Kondisi tidak valid.")
	case in.QtyIn < 0:
		return errors.New("Jumlah masuk tidak boleh negatif.")
	}
	return nil
}

// ToAsset membentuk Asset lengkap dari isian. AsetID diisi oleh store.
func (in AssetInput) ToAsset() Asset {
	a := Asset{
		CodeAset:    strings.TrimSpace(in.CodeAset),
		NameAsset:   strings.TrimSpace(in.NameAsset),
		Condition:   in.Condition,
		Status:      in.Status,
		Description: strings.TrimSpace(in.Description),
		QtyIn:       in.QtyIn,
		QtyReal:     in.QtyIn, // aset baru: belum ada yang keluar
		UpdateAt:    time.Now(),
	}
	if c, ok := FindCategory(in.CategoryID); ok {
		a.Categorys = []Category{c}
	}
	if l, ok := FindLocation(in.LocationID); ok {
		a.Locations = []Location{l}
	}
	return a
}

/*
package model

import (
	"time"
	"sync"

)
// ======================= MODEL =======================

type Complaint struct {
	ID          int     `json:"id"`
	Code        string  `json:"code"`
	UserID      int     `json:"userID"`
	AssetID     int     `json:"assetID"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Priority    float64 `json:"priority"`
	Status      string  `json:"status"`
	Note        string  `json:"note"`
}

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Category struct {
	CategoryID   int    `json:"categoryID"`
	NameCategory string `json:"nameCategory"`
}

type Location struct {
	LocationID   int    `json:"locationID"`
	NamaLocation string `json:"namaLocation"`
	Jenis        string `json:"jenis"`
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

// complaintJSON adalah bentuk body JSON untuk POST dan PUT.
// id dan code dibuat otomatis oleh server, jadi tidak perlu dikirim.
type complaintJSON struct {
	UserID      int     `json:"userID"`
	AssetID     int     `json:"assetID"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Priority    float64 `json:"priority"`
	Status      string  `json:"status"`
	Note        string  `json:"note"`
}

// ======================= STORE =======================

// Store menyimpan data di memori dan menyinkronkannya ke file JSON.
type Store struct {
	mu     sync.RWMutex
	path   string
	data   []Complaint
	users  []User   // hanya dibaca, dimuat sekali dari users.json
	assets []Asset // hanya dibaca, dimuat sekali dari assets.json
}
*/ 
