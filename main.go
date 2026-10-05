package main

import (
	"log"
	"net/http"
	"time"

	"project-test/handler"
	"project-test/store"
)

const addr = ":2100"

func main() {
	st, err := store.New(store.Paths{
		Complaints: "data/complaints.json",
		Users:      "data/users.json",
		Assets:     "data/assets.json",
	})
	if err != nil {
		log.Fatal(err)
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           handler.New(st),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Println("server listening on", addr)
	log.Fatal(srv.ListenAndServe())
}

/*
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

	"project-test/template"
	"project-test/model"

)

const addr = ":2100"






// ======================= MAIN =======================

func main() {
	store, err := NewStore("data/complaints.json", "data/users.json", "data/assets.json")
	if err != nil {
		log.Fatal(err)
	}

	log.Println("server listening on", addr)
	log.Fatal(http.ListenAndServe(addr, newMux(store)))
}

// ======================= HELPER HTTP =======================

// parseID membaca {id} dari URL. Jika tidak valid, langsung membalas 400.
func parseID(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		fail(w, r, http.StatusBadRequest, "id harus berupa angka")
		return 0, false
	}
	return id, true
}

// isJSON: true jika body request dikirim sebagai JSON (Postman, fetch, dll).
func isJSON(r *http.Request) bool {
	return strings.HasPrefix(r.Header.Get("Content-Type"), "application/json")
}

// wantsJSON: true jika klien meminta balasan JSON (header Accept atau ?format=json).
func wantsJSON(r *http.Request) bool {
	return strings.Contains(r.Header.Get("Accept"), "application/json") ||
		r.URL.Query().Get("format") == "json"
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Println("write json:", err)
	}
}

// fail membalas error dalam JSON untuk klien API, atau teks biasa untuk browser.
func fail(w http.ResponseWriter, r *http.Request, status int, msg string) {
	if isJSON(r) || wantsJSON(r) {
		writeJSON(w, status, map[string]string{"error": msg})
		return
	}
	http.Error(w, msg, status)
}

// notFound membalas 404 dalam format yang sesuai.
func notFound(w http.ResponseWriter, r *http.Request) {
	if isJSON(r) || wantsJSON(r) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "complaint tidak ditemukan"})
		return
	}
	http.NotFound(w, r)
}

// ======================= FORM / INPUT =======================

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

// readInput membaca body berupa JSON atau form, lalu menyeragamkannya ke formData.
func readInput(w http.ResponseWriter, r *http.Request) (formData, error) {
	if isJSON(r) {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // maksimal 1 MB
		var in complaintJSON
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			return formData{}, err
		}
		return formData{
			UserID:      strconv.Itoa(in.UserID),
			AssetID:     strconv.Itoa(in.AssetID),
			Title:       strings.TrimSpace(in.Title),
			Description: strings.TrimSpace(in.Description),
			Priority:    strconv.FormatFloat(in.Priority, 'f', -1, 64),
			Status:      in.Status,
			Note:        strings.TrimSpace(in.Note),
		}, nil
	}
	if err := r.ParseForm(); err != nil {
		return formData{}, err
	}
	return readForm(r), nil
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
	case "urgent", "high", "middle", "midle", "low":
		// "midle" tetap diterima agar kompatibel dengan data/template lama.
	default:
		return c, "Status tidak valid. Gunakan: urgent, high, middle, atau low."
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

// ======================= HANDLER CRUD =======================

func createComplaint(store *Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		form, err := readInput(w, r)
		if err != nil {
			fail(w, r, http.StatusBadRequest, "body tidak valid: "+err.Error())
			return
		}

		complaint, msg := store.validate(form)
		if msg != "" {
			if isJSON(r) {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
				return
			}
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

		created, err := store.Add(complaint)
		if err != nil {
			log.Println("save complaint:", err)
			fail(w, r, http.StatusInternalServerError, "gagal menyimpan data")
			return
		}

		if isJSON(r) {
			writeJSON(w, http.StatusCreated, created)
			return
		}
		http.Redirect(w, r, "/complaints", http.StatusSeeOther)
	}
}

func updateComplaint(store *Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(w, r)
		if !ok {
			return
		}

		form, err := readInput(w, r)
		if err != nil {
			fail(w, r, http.StatusBadRequest, "body tidak valid: "+err.Error())
			return
		}

		complaint, msg := store.validate(form)
		if msg != "" {
			if isJSON(r) {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
				return
			}
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

		updated, err := store.Update(id, complaint)
		if err != nil {
			if errors.Is(err, errNotFound) {
				notFound(w, r)
				return
			}
			log.Println("update complaint:", err)
			fail(w, r, http.StatusInternalServerError, "gagal menyimpan data")
			return
		}

		if isJSON(r) {
			writeJSON(w, http.StatusOK, updated)
			return
		}
		http.Redirect(w, r, fmt.Sprintf("/complaints/%d", id), http.StatusSeeOther)
	}
}

// deleteComplaint dipakai oleh DELETE (API, balas 204) dan POST .../delete (form, redirect).
func deleteComplaint(store *Store, redirect bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(w, r)
		if !ok {
			return
		}

		if err := store.Delete(id); err != nil {
			if errors.Is(err, errNotFound) {
				notFound(w, r)
				return
			}
			log.Println("delete complaint:", err)
			fail(w, r, http.StatusInternalServerError, "gagal menghapus data")
			return
		}

		if redirect {
			http.Redirect(w, r, "/complaints", http.StatusSeeOther)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// ======================= ROUTING =======================

func newMux(store *Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		writeHTML(w, http.StatusOK, pageData{Title: "Sistem Pengaduan", Mode: "index", Complaints: store.All()})
	})

	// ---------- READ (daftar) ----------

	mux.HandleFunc("GET /complaints", func(w http.ResponseWriter, r *http.Request) {
		if wantsJSON(r) {
			writeJSON(w, http.StatusOK, store.All())
			return
		}
		writeHTML(w, http.StatusOK, pageData{Title: "Daftar Pengaduan", Mode: "showComplaint", Complaints: store.All()})
	})

	mux.HandleFunc("GET /assets", func(w http.ResponseWriter, r *http.Request) {
		if wantsJSON(r) {
			writeJSON(w, http.StatusOK, store.AllAssets())
			return
		}
		writeHTML(w, http.StatusOK, pageData{Title: "Daftar Asset", Mode: "showAsset", Assets: store.AllAssets()})
	})

	// ---------- CREATE (form) ----------

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

	// ---------- CREATE (proses): form HTML maupun JSON ----------

	mux.HandleFunc("POST /complaints", createComplaint(store))

	// ---------- READ (detail) ----------

	mux.HandleFunc("GET /complaints/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, ok := parseID(w, r)
		if !ok {
			return
		}

		complaint, found := store.Find(id)
		if !found {
			notFound(w, r)
			return
		}

		if wantsJSON(r) {
			writeJSON(w, http.StatusOK, complaint)
			return
		}
		writeHTML(w, http.StatusOK, pageData{Title: complaint.Title, Mode: "detailComplaint", Complaint: complaint})
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

	// PUT untuk API (Postman, fetch). POST untuk form HTML (browser hanya mendukung GET/POST).
	// Keduanya memakai handler yang sama, dan sama-sama menerima form maupun JSON.
	mux.HandleFunc("PUT /complaints/{id}", updateComplaint(store))
	mux.HandleFunc("POST /complaints/{id}", updateComplaint(store))

	// ---------- DELETE ----------

	// DELETE untuk API (balas 204), POST .../delete untuk tombol di halaman HTML (redirect).
	mux.HandleFunc("DELETE /complaints/{id}", deleteComplaint(store, false))
	mux.HandleFunc("POST /complaints/{id}/delete", deleteComplaint(store, true))

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok\n"))
	})

	return mux
}



*/
