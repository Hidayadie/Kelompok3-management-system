package handler

import (
	"errors"
	//"fmt"
	"log"
	"net/http"
	//"strconv"

	"project-test/model"
	"project-test/store"
)

func (h *Handler) apiListComplaints(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.store.Complaints())
}

func (h *Handler) apiGetComplaint(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		jsonError(w, http.StatusBadRequest, "id harus berupa angka positif")
		return
	}
	c, found := h.store.FindComplaint(id)
	if !found {
		jsonError(w, http.StatusNotFound, "pengaduan tidak ditemukan")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *Handler) apiCreateComplaint(w http.ResponseWriter, r *http.Request) {
	var c model.Complaint // id dan code dari klien diabaikan, store yang membuatnya
	if !decodeJSON(w, r, &c) {
		return
	}
	if err := h.store.ValidateComplaint(c); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}

	created, err := h.store.AddComplaint(c)
	if err != nil {
		log.Println("save complaint:", err)
		jsonError(w, http.StatusInternalServerError, "gagal menyimpan data")
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (h *Handler) apiUpdateComplaint(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		jsonError(w, http.StatusBadRequest, "id harus berupa angka positif")
		return
	}
	var c model.Complaint
	if !decodeJSON(w, r, &c) {
		return
	}
	if err := h.store.ValidateComplaint(c); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}

	updated, err := h.store.UpdateComplaint(id, c)
	switch {
	case errors.Is(err, store.ErrNotFound):
		jsonError(w, http.StatusNotFound, "pengaduan tidak ditemukan")
	case err != nil:
		log.Println("update complaint:", err)
		jsonError(w, http.StatusInternalServerError, "gagal menyimpan data")
	default:
		writeJSON(w, http.StatusOK, updated)
	}
}

func (h *Handler) apiDeleteComplaint(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		jsonError(w, http.StatusBadRequest, "id harus berupa angka positif")
		return
	}

	err := h.store.DeleteComplaint(id)
	switch {
	case errors.Is(err, store.ErrNotFound):
		jsonError(w, http.StatusNotFound, "pengaduan tidak ditemukan")
	case err != nil:
		log.Println("delete complaint:", err)
		jsonError(w, http.StatusInternalServerError, "gagal menghapus data")
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}
