package handler

import (
	//"errors"
	"log"
	"net/http"
	//"strconv"

	"project-test/model"
)

func (h *Handler) apiListAssets(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.store.Assets())
}

func (h *Handler) apiGetAsset(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		jsonError(w, http.StatusBadRequest, "id harus berupa angka positif")
		return
	}
	a, found := h.store.FindAsset(id)
	if !found {
		jsonError(w, http.StatusNotFound, "aset tidak ditemukan")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

func (h *Handler) apiCreateAsset(w http.ResponseWriter, r *http.Request) {
	var in model.AssetInput
	if !decodeJSON(w, r, &in) {
		return
	}
	if err := h.store.ValidateAsset(in); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}

	created, err := h.store.AddAsset(in)
	if err != nil {
		log.Println("save asset:", err)
		jsonError(w, http.StatusInternalServerError, "gagal menyimpan data")
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

// ======================= API: USER =======================

func (h *Handler) apiListUsers(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.store.Users())
}
