package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

const addr = ":2100"

var errNotFound = errors.New("complaint not found")

type Complaints struct {
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

type Assets struct {
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

// Store menyimpan data di memori dan menyinkronkannya ke file JSON.
type Store struct {
	mu     sync.RWMutex
	path   string
	data   []Complaints
	users  []User   // hanya dibaca, dimuat sekali dari users.json
	assets []Assets // hanya dibaca, dimuat sekali dari assets.json
}

func NewStore(complaintsPath, usersPath, assetsPath string) (*Store, error) {
	data, err := loadComplaints(complaintsPath)
	if err != nil {
		return nil, err
	}
	users, err := loadUsers(usersPath)
	if err != nil {
		return nil, err
	}
	assets, err := loadAssets(assetsPath)
	if err != nil {
		return nil, err
	}
	return &Store{path: complaintsPath, data: data, users: users, assets: assets}, nil
}

func (s *Store) Users() []User {
	return s.users
}

func (s *Store) Assets() []Assets {
	return s.assets
}

func (s *Store) HasAsset(id int) bool {
	for _, a := range s.assets {
		if a.AsetID == id {
			return true
		}
	}
	return false
}

func (s *Store) HasUser(id int) bool {
	for _, u := range s.users {
		if u.ID == id {
			return true
		}
	}
	return false
}

// validate memvalidasi input form, termasuk memastikan user dan asset ada di data JSON.
func (s *Store) validate(f formData) (Complaints, string) {
	c, msg := f.toComplaint()
	if msg == "" && !s.HasUser(c.UserID) {
		msg = "User tidak ditemukan di data users."
	}
	if msg == "" && !s.HasAsset(c.AssetID) {
		msg = "Asset tidak ditemukan di data assets."
	}
	return c, msg
}

// All mengembalikan salinan data agar aman dibaca bersamaan.
func (s *Store) All() []Complaints {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Complaints, len(s.data))
	copy(out, s.data)
	return out
}

func (s *Store) AllAssets() []Assets {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Assets, len(s.assets))
	copy(out, s.assets)
	return out
}

func (s *Store) Find(id int) (Complaints, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, c := range s.data {
		if c.ID == id {
			return c, true
		}
	}
	return Complaints{}, false
}

// Add menambah pengaduan baru: ID dan Code dibuat otomatis, lalu disimpan ke file.
func (s *Store) Add(c Complaints) (Complaints, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	maxID := 0
	for _, existing := range s.data {
		if existing.ID > maxID {
			maxID = existing.ID
		}
	}
	c.ID = maxID + 1
	c.Code = fmt.Sprintf("CMP-%03d", c.ID)

	updated := append(append([]Complaints{}, s.data...), c)
	if err := saveComplaints(s.path, updated); err != nil {
		return Complaints{}, err
	}
	s.data = updated
	return c, nil
}

// Update mengganti isi pengaduan dengan ID tertentu. ID dan Code tidak berubah.
func (s *Store) Update(id int, c Complaints) (Complaints, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, existing := range s.data {
		if existing.ID != id {
			continue
		}

		c.ID = existing.ID
		c.Code = existing.Code

		updated := append([]Complaints{}, s.data...)
		updated[i] = c
		if err := saveComplaints(s.path, updated); err != nil {
			return Complaints{}, err
		}
		s.data = updated
		return c, nil
	}
	return Complaints{}, errNotFound
}

// Delete menghapus pengaduan dengan ID tertentu lalu menyimpan ke file.
func (s *Store) Delete(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, existing := range s.data {
		if existing.ID != id {
			continue
		}

		updated := make([]Complaints, 0, len(s.data)-1)
		updated = append(updated, s.data[:i]...)
		updated = append(updated, s.data[i+1:]...)
		if err := saveComplaints(s.path, updated); err != nil {
			return err
		}
		s.data = updated
		return nil
	}
	return errNotFound
}

func main() {
	store, err := NewStore("data/complaints.json", "data/users.json", "data/assets.json")
	if err != nil {
		log.Fatal(err)
	}

	log.Println("server listening on", addr)
	log.Fatal(http.ListenAndServe(addr, newMux(store)))
}

// parseID membaca {id} dari URL. Jika tidak valid, langsung membalas 400.
func parseID(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "id harus berupa angka", http.StatusBadRequest)
		return 0, false
	}
	return id, true
}

func newMux(store *Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		writeHTML(w, http.StatusOK, pageData{Title: "Sistem Pengaduan", Mode: "index", Complaints: store.All()})
	})

	mux.HandleFunc("GET /complaints", func(w http.ResponseWriter, r *http.Request) {
		writeHTML(w, http.StatusOK, pageData{Title: "Daftar Pengaduan", Mode: "showComplaint", Complaints: store.All()})
	})

	mux.HandleFunc("GET /assets", func(w http.ResponseWriter, r *http.Request) {
		writeHTML(w, http.StatusOK, pageData{Title: "Daftar Asset", Mode: "showAsset", Assets: store.AllAssets()})
		fmt.Println("Jumlah aset: ", len(store.assets))
	})
	/*
		mux.HandleFunc("GET /Categories", func(w http.ResponseWriter, r *http.Request) {
			writeHTML(w, http.StatusOK, pageData{Title: "Daftar Category", Mode: "showCategory", Category: store.All()})
		})*/

	// ---------- CREATE ----------

	// Rute literal "/new" lebih spesifik dari "/{id}", jadi tidak bentrok.
	mux.HandleFunc("GET /complaints/new", func(w http.ResponseWriter, r *http.Request) {
		writeHTML(w, http.StatusOK, pageData{
			Title:  "Tambah Pengaduan",
			Mode:   "form",
			Action: "/complaints",
			Users:  store.Users(),
			Assets: store.Assets(),
			Form:   formData{Priority: "1", Status: "urgent"},
		})
	})

	// Rute literal "/new" lebih spesifik dari "/{id}", jadi tidak bentrok.
	mux.HandleFunc("GET /assets/new", func(w http.ResponseWriter, r *http.Request) {
		writeHTML(w, http.StatusOK, pageData{
			Title:  "Tambah Assets",
			Mode:   "formAsset",
			Action: "/assets",
			Users:  store.Users(),
			Assets: store.Assets(),
			Form:   formData{Priority: "1", Status: "urgent"},
		})
	})

	mux.HandleFunc("POST /complaints", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			http.Error(w, "form tidak valid", http.StatusBadRequest)
			return
		}

		form := readForm(r)
		complaint, msg := store.validate(form)
		if msg != "" {
			writeHTML(w, http.StatusBadRequest, pageData{
				Title:  "Tambah Pengaduan",
				Mode:   "form",
				Action: "/complaints",
				Users:  store.Users(),
				Assets: store.Assets(),
				Form:   form,
				Error:  msg,
			})
			return
		}

		if _, err := store.Add(complaint); err != nil {
			log.Println("save complaint:", err)
			http.Error(w, "gagal menyimpan data", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "/complaints", http.StatusSeeOther)
	})

	// ---------- READ (detail) ----------

	mux.HandleFunc("GET /complaints/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(w, r)
		if !ok {
			return
		}

		complaint, found := store.Find(id)
		if !found {
			http.NotFound(w, r)
			return
		}

		writeHTML(w, http.StatusOK, pageData{Title: complaint.Title, Mode: "detail", Complaint: complaint})
	})

	// ---------- UPDATE ----------

	// Menampilkan form yang sudah terisi data lama.
	mux.HandleFunc("GET /complaints/{id}/edit", func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(w, r)
		if !ok {
			return
		}

		complaint, found := store.Find(id)
		if !found {
			http.NotFound(w, r)
			return
		}

		writeHTML(w, http.StatusOK, pageData{
			Title:  "Edit Pengaduan",
			Mode:   "form",
			IsEdit: true,
			Action: fmt.Sprintf("/complaints/%d", id),
			Users:  store.Users(),
			Assets: store.Assets(),
			Form:   formFromComplaint(complaint),
		})
	})

	// Form HTML hanya mendukung GET dan POST, jadi update memakai POST /complaints/{id}.
	mux.HandleFunc("POST /complaints/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(w, r)
		if !ok {
			return
		}
		if err := r.ParseForm(); err != nil {
			http.Error(w, "form tidak valid", http.StatusBadRequest)
			return
		}

		form := readForm(r)
		complaint, msg := store.validate(form)
		if msg != "" {
			writeHTML(w, http.StatusBadRequest, pageData{
				Title:  "Edit Pengaduan",
				Mode:   "form",
				IsEdit: true,
				Action: fmt.Sprintf("/complaints/%d", id),
				Users:  store.Users(),
				Assets: store.Assets(),
				Form:   form,
				Error:  msg,
			})
			return
		}

		if _, err := store.Update(id, complaint); err != nil {
			if errors.Is(err, errNotFound) {
				http.NotFound(w, r)
				return
			}
			log.Println("update complaint:", err)
			http.Error(w, "gagal menyimpan data", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, fmt.Sprintf("/complaints/%d", id), http.StatusSeeOther)
	})

	// ---------- DELETE ----------

	mux.HandleFunc("POST /complaints/{id}/delete", func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(w, r)
		if !ok {
			return
		}

		if err := store.Delete(id); err != nil {
			if errors.Is(err, errNotFound) {
				http.NotFound(w, r)
				return
			}
			log.Println("delete complaint:", err)
			http.Error(w, "gagal menghapus data", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "/complaints", http.StatusSeeOther)
	})

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok\n"))
	})

	return mux
}

// formData menyimpan input mentah (string) agar bisa ditampilkan ulang saat validasi gagal.
type formData struct {
	UserID, AssetID, Title, Description, Priority, Status, Note string
}

// readForm membaca field form dari request (r.ParseForm harus sudah dipanggil).
func readForm(r *http.Request) formData {
	return formData{
		UserID:      strings.TrimSpace(r.PostFormValue("userID")),
		AssetID:     strings.TrimSpace(r.PostFormValue("assetID")),
		Title:       strings.TrimSpace(r.PostFormValue("title")),
		Description: strings.TrimSpace(r.PostFormValue("description")),
		Priority:    strings.TrimSpace(r.PostFormValue("priority")),
		Status:      r.PostFormValue("status"),
		Note:        strings.TrimSpace(r.PostFormValue("note")),
	}
}

// formFromComplaint mengubah data tersimpan menjadi isian form (untuk halaman edit).
func formFromComplaint(c Complaints) formData {
	return formData{
		UserID:      strconv.Itoa(c.UserID),
		AssetID:     strconv.Itoa(c.AssetID),
		Title:       c.Title,
		Description: c.Description,
		Priority:    strconv.FormatFloat(c.Priority, 'f', -1, 64),
		Status:      c.Status,
		Note:        c.Note,
	}
}

func (f formData) toComplaint() (Complaints, string) {
	var c Complaints

	userID, err := strconv.Atoi(f.UserID)
	if err != nil || userID <= 0 {
		return c, "User ID harus berupa angka positif."
	}
	assetID, err := strconv.Atoi(f.AssetID)
	if err != nil || assetID <= 0 {
		return c, "Asset ID harus berupa angka positif."
	}
	if f.Title == "" {
		return c, "Judul wajib diisi."
	}
	if f.Description == "" {
		return c, "Deskripsi wajib diisi."
	}
	priority, err := strconv.ParseFloat(f.Priority, 64)
	if err != nil || priority < 0 {
		return c, "Prioritas harus berupa angka (0 atau lebih)."
	}
	switch f.Status {
	case "urgent", "midle", "low":
	default:
		return c, "Status tidak valid."
	}

	return Complaints{
		UserID:      userID,
		AssetID:     assetID,
		Title:       f.Title,
		Description: f.Description,
		Priority:    priority,
		Status:      f.Status,
		Note:        f.Note,
	}, ""
}

// loadComplaints boleh mengembalikan data kosong, karena semua pengaduan
// bisa saja sudah dihapus lewat fitur delete.
func loadComplaints(path string) ([]Complaints, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var complaints []Complaints
	if err := json.NewDecoder(file).Decode(&complaints); err != nil {
		return nil, err
	}

	return complaints, nil
}

func loadUsers(path string) ([]User, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var users []User
	if err := json.NewDecoder(file).Decode(&users); err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return nil, errors.New("users data is empty")
	}

	return users, nil
}

func loadAssets(path string) ([]Assets, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var assets []Assets
	if err := json.NewDecoder(file).Decode(&assets); err != nil {
		return nil, err
	}
	if len(assets) == 0 {
		return nil, errors.New("assets data is empty")
	}

	return assets, nil
}

// saveComplaints menulis ke file sementara dulu, lalu me-rename,
// supaya file asli tidak rusak jika proses terhenti di tengah penulisan.
func saveComplaints(path string, complaints []Complaints) error {
	if complaints == nil {
		complaints = []Complaints{} // supaya tersimpan sebagai [] bukan null
	}

	raw, err := json.MarshalIndent(complaints, "", "  ")
	if err != nil {
		return err
	}

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

type pageData struct {
	Title      string
	Mode       string // "index", "detail", atau "form", "formAssets"
	IsEdit     bool   // true jika form dipakai untuk edit
	Action     string // URL tujuan submit form
	Complaints []Complaints
	Complaint  Complaints
	Users      []User
	Assets     []Assets
	Asset      Assets
	Form       formData
	Error      string
}

func writeHTML(w http.ResponseWriter, status int, data pageData) {

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)

	// Header
	if err := headerTemplate.Execute(w, data); err != nil {
		log.Println("write header:", err)
		return
	}

	// Body

	if err := bodyTemplate.Execute(w, data); err != nil {
		log.Println("write body:", err)
		return
	}

	// Footer
	if err := footerTemplate.Execute(w, data); err != nil {
		log.Println("write footer:", err)
		return
	}
}
