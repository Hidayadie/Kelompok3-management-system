// Package store mengurus penyimpanan data (sekarang file JSON, nanti bisa diganti database)
// Package ini mengimpor model, tidak tahu apa apa soal http / html
package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"
	"sync"

	"project-test/model"
)

var ErrNotFound = errors.New("data tidak ditemukan")

type Paths struct {
	Complaints, Users, Assets string
}

// Store menyimpan data di memori dan menyinkronkannya ke file json
// salin slice -> ubah salinan -> simpan ke file -> baru ganti data di memori
// Jika penyimpanan gagal, data di memori tidak ikut berubah.
type Store struct {
	mu         sync.RWMutex
	paths      Paths
	complaints []model.Complaint
	users      []model.User // blm kepake/read only
	assets     []model.Asset
}

// yg dipanggil main
func New(p Paths) (*Store, error) {
	complaints, err := loadJSON[model.Complaint](p.Complaints)
	if err != nil {
		return nil, err
	}
	users, err := loadJSON[model.User](p.Users)
	if err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return nil, fmt.Errorf("%s: data user kosong", p.Users)
	}
	assets, err := loadJSON[model.Asset](p.Assets)
	if err != nil {
		return nil, err
	}
	return &Store{
		paths: p, 
		complaints: complaints, 
		users: users, 
		assets: assets}, nil
}

// ======================= USER =======================

func (s *Store) Users() []model.User {
	return clone(s.users) // users tidak pernah berubah, jadi aman tanpa lock
}

// ======================= COMPLAINT =======================

func (s *Store) Complaints() []model.Complaint {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return clone(s.complaints)
}

func (s *Store) FindComplaint(id int) (model.Complaint, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	i := slices.IndexFunc(s.complaints, func(c model.Complaint) bool { return c.ID == id })
	if i < 0 {
		return model.Complaint{}, false
	}
	return s.complaints[i], true
}

// ValidateComplaint = aturan model + pemeriksaan bahwa user dan asset benar-benar ada
func (s *Store) ValidateComplaint(c model.Complaint) error {
	if err := c.Validate(); err != nil {
		return err
	}
	if !slices.ContainsFunc(s.users, func(u model.User) bool { return u.ID == c.UserID }) {
		return errors.New("User tidak ditemukan di data users.")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	if !slices.ContainsFunc(s.assets, func(a model.Asset) bool { return a.AsetID == c.AssetID }) {
		return errors.New("Asset tidak ditemukan di data assets.")
	}
	return nil
}

// AddComplaint membuat ID dan Code otomatis, lalu menyimpan ke file
func (s *Store) AddComplaint(c model.Complaint) (model.Complaint, error) {
	c.Normalize()

	s.mu.Lock()
	defer s.mu.Unlock()

	maxID := 0
	for _, e := range s.complaints {
		maxID = max(maxID, e.ID)
	}
	c.ID = maxID + 1
	c.Code = fmt.Sprintf("CMP-%03d", c.ID)

	updated := append(clone(s.complaints), c)
	if err := saveJSON(s.paths.Complaints, updated); err != nil {
		return model.Complaint{}, err
	}
	s.complaints = updated
	return c, nil
}

// UpdateComplaint mengganti isi pengaduan. ID dan Code tidak berubah
func (s *Store) UpdateComplaint(id int, c model.Complaint) (model.Complaint, error) {
	c.Normalize()

	s.mu.Lock()
	defer s.mu.Unlock()

	i := slices.IndexFunc(s.complaints, func(e model.Complaint) bool { return e.ID == id })
	if i < 0 {
		return model.Complaint{}, ErrNotFound
	}
	c.ID, c.Code = s.complaints[i].ID, s.complaints[i].Code

	updated := clone(s.complaints)
	updated[i] = c
	if err := saveJSON(s.paths.Complaints, updated); err != nil {
		return model.Complaint{}, err
	}
	s.complaints = updated
	return c, nil
}

func (s *Store) DeleteComplaint(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	i := slices.IndexFunc(s.complaints, func(e model.Complaint) bool { return e.ID == id })
	if i < 0 {
		return ErrNotFound
	}
	updated := slices.Delete(clone(s.complaints), i, i+1)
	if err := saveJSON(s.paths.Complaints, updated); err != nil {
		return err
	}
	s.complaints = updated
	return nil
}

// ======================= ASSET =======================

func (s *Store) Assets() []model.Asset {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return clone(s.assets)
}

func (s *Store) FindAsset(id int) (model.Asset, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	i := slices.IndexFunc(s.assets, func(a model.Asset) bool { return a.AsetID == id })
	if i < 0 {
		return model.Asset{}, false
	}
	return s.assets[i], true
}

// ValidateAsset = aturan model + kode aset tidak boleh kembar
func (s *Store) ValidateAsset(in model.AssetInput) error {
	if err := in.Validate(); err != nil {
		return err
	}
	code := strings.TrimSpace(in.CodeAset)

	s.mu.RLock()
	defer s.mu.RUnlock()
	if slices.ContainsFunc(s.assets, func(a model.Asset) bool { return strings.EqualFold(a.CodeAset, code) }) {
		return errors.New("Kode aset sudah dipakai.")
	}
	return nil
}

func (s *Store) AddAsset(in model.AssetInput) (model.Asset, error) {
	a := in.ToAsset()

	s.mu.Lock()
	defer s.mu.Unlock()

	maxID := 0
	for _, e := range s.assets {
		maxID = max(maxID, e.AsetID)
	}
	a.AsetID = maxID + 1

	updated := append(clone(s.assets), a)
	if err := saveJSON(s.paths.Assets, updated); err != nil {
		return model.Asset{}, err
	}
	s.assets = updated
	return a, nil
}

// ======================= FILE JSON =======================

// clone selalu mengembalikan slice non-nil, supaya json-nya [] dan bukan null.
// mnding json kosong, bukan nil, json kosong = "data kosong/tidak ditemukan"
// kalo nil ntr... duar gtw
func clone[T any](s []T) []T {
	return append([]T{}, s...)
}

func loadJSON[T any](path string) ([]T, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var items []T
	if err := json.NewDecoder(f).Decode(&items); err != nil {
		return nil, fmt.Errorf("%s: %w", path, err) // nama file ikut tampil di pesan error
	}
	return items, nil
}

// saveJSON menulis ke file sementara dulu, lalu rename, supaya file asli
// tidak rusak jika proses terhenti di tengah penulisan
// jenisnya memakai any btw
func saveJSON[T any](path string, items []T) error {
	if items == nil {
		items = []T{}
	}
	raw, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
