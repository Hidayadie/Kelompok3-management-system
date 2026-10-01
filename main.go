package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
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
		writeHTML(w, http.StatusOK, pageData{Title: "Daftar Pengaduan", Mode: "index", Complaints: store.All()})
	})

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
	Mode       string // "index", "detail", atau "form"
	IsEdit     bool   // true jika form dipakai untuk edit
	Action     string // URL tujuan submit form
	Complaints []Complaints
	Complaint  Complaints
	Users      []User
	Assets     []Assets
	Form       formData
	Error      string
}

func writeHTML(w http.ResponseWriter, status int, data pageData) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	if err := pageTemplate.Execute(w, data); err != nil {
		log.Println("write response:", err)
	}
}

var pageTemplate = template.Must(template.New("page").Parse(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{.Title}}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #222; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; vertical-align: top; }
    thead th { background: #f0f0f0; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody tr:hover { background: #eef5ff; }
    section { overflow-x: auto; }
    .btn { display: inline-block; padding: 8px 14px; background: #2563eb; color: #fff;
           border: 0; border-radius: 6px; text-decoration: none; cursor: pointer; font-size: 1rem; }
    .btn:hover { background: #1d4ed8; }
    .btn-sm { padding: 4px 10px; font-size: 0.9rem; }
    .btn-danger { background: #dc2626; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-warn { background: #d97706; }
    .btn-warn:hover { background: #b45309; }
    form.inline { display: inline; max-width: none; }
    .row-actions { white-space: nowrap; }
    form { max-width: 560px; }
    label { display: block; margin-top: 1rem; font-weight: 600; }
    input, select, textarea { width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box;
                              border: 1px solid #bbb; border-radius: 6px; font: inherit; }
    .error { background: #fee2e2; color: #991b1b; padding: 10px 12px; border-radius: 6px; }
    .actions { margin-top: 1.5rem; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>{{.Title}}</h1>
      {{if eq .Mode "index"}}
        <p><a class="btn" href="/complaints/new">+ Tambah Pengaduan</a></p>
      {{else}}
        <p><a href="/complaints">Kembali ke daftar pengaduan</a></p>
      {{end}}
    </header>

    {{if eq .Mode "index"}}
      <section>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Kode</th>
              <th>User ID</th>
              <th>Asset ID</th>
              <th>Judul</th>
              <th>Deskripsi</th>
              <th>Prioritas</th>
              <th>Status</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {{range .Complaints}}
            <tr>
              <td>{{.ID}}</td>
              <td>{{.Code}}</td>
              <td>{{.UserID}}</td>
              <td>{{.AssetID}}</td>
              <td><a href="/complaints/{{.ID}}">{{.Title}}</a></td>
              <td>{{.Description}}</td>
              <td>{{.Priority}}</td>
              <td>{{.Status}}</td>
              <td>{{.Note}}</td>
              <td class="row-actions">
                <a class="btn btn-sm btn-warn" href="/complaints/{{.ID}}/edit">Edit</a>
                <form class="inline" method="post" action="/complaints/{{.ID}}/delete" onsubmit="return confirm('Hapus pengaduan ini?')">
                  <button class="btn btn-sm btn-danger" type="submit">Hapus</button>
                </form>
              </td>
            </tr>
            {{else}}
            <tr><td colspan="10">Belum ada pengaduan.</td></tr>
            {{end}}
          </tbody>
        </table>
      </section>

    {{else if eq .Mode "form"}}
      {{if .Error}}<p class="error">{{.Error}}</p>{{end}}
      <form method="post" action="{{.Action}}">
        <label for="userID">User</label>
        <select id="userID" name="userID" required>
          <option value="">-- Pilih user --</option>
          {{range .Users}}
          <option value="{{.ID}}" {{if eq (printf "%d" .ID) $.Form.UserID}}selected{{end}}>{{.ID}} - {{.Name}}</option>
          {{end}}
        </select>

        <label for="assetID">Asset</label>
        <select id="assetID" name="assetID" required>
          <option value="">-- Pilih asset --</option>
          {{range .Assets}}
          <option value="{{.AsetID}}" {{if eq (printf "%d" .AsetID) $.Form.AssetID}}selected{{end}}>{{.CodeAset}} - {{.NameAsset}}</option>
          {{end}}
        </select>

        <label for="title">Judul</label>
        <input id="title" name="title" type="text" required value="{{.Form.Title}}">

        <label for="description">Deskripsi</label>
        <textarea id="description" name="description" rows="4" required>{{.Form.Description}}</textarea>

        <label for="priority">Prioritas</label>
        <input id="priority" name="priority" type="number" min="0" step="any" required value="{{.Form.Priority}}">

        <label for="status">Status</label>
        <select id="status" name="status">
          <option value="urgent" {{if eq .Form.Status "urgent"}}selected{{end}}>Urgent</option>
          <option value="midle" {{if eq .Form.Status "midle"}}selected{{end}}>Midle</option>
          <option value="low" {{if eq .Form.Status "low"}}selected{{end}}>Low</option>
        </select>

        <label for="note">Catatan (opsional)</label>
        <textarea id="note" name="note" rows="2">{{.Form.Note}}</textarea>

        <div class="actions">
          <button class="btn" type="submit">{{if .IsEdit}}Simpan Perubahan{{else}}Simpan{{end}}</button>
        </div>
      </form>

    {{else}}
      <article>
        <p>{{.Complaint.Description}}</p>
        <table>
          <tr><th>ID</th><td>{{.Complaint.ID}}</td></tr>
          <tr><th>Kode</th><td>{{.Complaint.Code}}</td></tr>
          <tr><th>User ID</th><td>{{.Complaint.UserID}}</td></tr>
          <tr><th>Asset ID</th><td>{{.Complaint.AssetID}}</td></tr>
          <tr><th>Prioritas</th><td>{{.Complaint.Priority}}</td></tr>
          <tr><th>Status</th><td>{{.Complaint.Status}}</td></tr>
          <tr><th>Catatan</th><td>{{.Complaint.Note}}</td></tr>
        </table>
        <div class="actions">
          <a class="btn btn-warn" href="/complaints/{{.Complaint.ID}}/edit">Edit</a>
          <form class="inline" method="post" action="/complaints/{{.Complaint.ID}}/delete" onsubmit="return confirm('Hapus pengaduan ini?')">
            <button class="btn btn-danger" type="submit">Hapus</button>
          </form>
        </div>
      </article>
    {{end}}
  </main>
</body>
</html>
`))
