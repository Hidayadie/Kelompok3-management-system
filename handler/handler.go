// Package handler menghubungkan request HTTP ke store dan view.
// Semua rute didaftarkan di New(), jadi satu fungsi ini adalah "daftar endpoint" aplikasi.
package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"project-test/store"
	"project-test/view"
)

const maxBody = 1 << 20 // batas body request: 1 MB

type Handler struct {
	store *store.Store
}

// data adalah isi khusus tiap halaman HTML (diakses di template sebagai .Data.Nama).
type data = map[string]any

func New(s *store.Store) http.Handler {
	h := &Handler{store: s}
	mux := http.NewServeMux()

	// ---------- WEB (HTML) ----------

	mux.HandleFunc("GET /{$}", h.home) // {$} = hanya "/", path lain otomatis 404
	mux.Handle("GET /static/", view.Static())

	mux.HandleFunc("GET /complaints", h.listComplaints)
	mux.HandleFunc("GET /complaints/new", h.newComplaintForm) // literal menang atas {id}
	mux.HandleFunc("POST /complaints", h.createComplaint)
	mux.HandleFunc("GET /complaints/{id}", h.showComplaint)
	mux.HandleFunc("GET /complaints/{id}/edit", h.editComplaintForm)
	mux.HandleFunc("POST /complaints/{id}", h.updateComplaint) // browser hanya bisa GET/POST
	mux.HandleFunc("POST /complaints/{id}/delete", h.deleteComplaint)

	mux.HandleFunc("GET /assets", h.listAssets)
	mux.HandleFunc("GET /assets/new", h.newAssetForm)
	mux.HandleFunc("POST /assets", h.createAsset)

	// ---------- API (JSON) ----------

	mux.HandleFunc("GET /api/complaints", h.apiListComplaints)
	mux.HandleFunc("POST /api/complaints", h.apiCreateComplaint)
	mux.HandleFunc("GET /api/complaints/{id}", h.apiGetComplaint)
	mux.HandleFunc("PUT /api/complaints/{id}", h.apiUpdateComplaint)
	mux.HandleFunc("DELETE /api/complaints/{id}", h.apiDeleteComplaint)

	mux.HandleFunc("GET /api/assets", h.apiListAssets)
	mux.HandleFunc("POST /api/assets", h.apiCreateAsset)
	mux.HandleFunc("GET /api/assets/{id}", h.apiGetAsset)

	mux.HandleFunc("GET /api/users", h.apiListUsers)

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok\n"))
	})

	return middleware(mux)
}

// ======================= MIDDLEWARE =======================

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

// middleware membungkus seluruh mux: membatasi ukuran body dan mencatat tiap request di log.
func middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		r.Body = http.MaxBytesReader(sw, r.Body, maxBody)

		next.ServeHTTP(sw, r)

		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, sw.status, time.Since(start).Round(time.Microsecond))
	})
}

// ======================= HELPER =======================

// render membungkus view.Render supaya pemanggilnya ringkas.
func render(w http.ResponseWriter, status int, page, title, active string, d data) {
	view.Render(w, status, page, view.Page{Title: title, Active: active, Data: d})
}

// pathID membaca {id} dari URL.
func pathID(r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	return id, err == nil && id > 0
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Println("write json:", err)
	}
}

func jsonError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// decodeJSON membaca body JSON ke dst. Jika gagal, langsung membalas 400 dan mengembalikan false.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		jsonError(w, http.StatusBadRequest, "body JSON tidak valid: "+err.Error())
		return false
	}
	return true
}

func (h *Handler) home(w http.ResponseWriter, r *http.Request) {
	render(w, http.StatusOK, "index.html", "Sistem Pengaduan", "home", nil)
}
