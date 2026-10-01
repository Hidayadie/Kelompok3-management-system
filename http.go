package asset

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	assetio "project-test/io"
	"project-test/model"
)

func RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/assets", assetsHandler)
	mux.HandleFunc("/assets/", assetByIDHandler)
}

func assetsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getAssets(w)
	case http.MethodPost:
		postAsset(w, r)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method tidak diizinkan")
	}
}

func assetByIDHandler(w http.ResponseWriter, r *http.Request) {
	idText := strings.TrimPrefix(r.URL.Path, "/assets/")
	id, err := strconv.Atoi(idText)
	if err != nil {
		writeError(w, http.StatusBadRequest, "ID asset harus berupa angka")
		return
	}

	switch r.Method {
	case http.MethodPut:
		putAsset(w, r, id)
	case http.MethodDelete:
		deleteAsset(w, id)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method tidak diizinkan")
	}
}

func getAssets(w http.ResponseWriter) {
	assets := assetio.ReadAsset()
	fmt.Fprintf(w, "Jumlah asset: %d\n", len(assets))
	writeJSON(w, http.StatusOK, assets)
}

func postAsset(w http.ResponseWriter, r *http.Request) {
	var newAsset model.Asset

	if err := json.NewDecoder(r.Body).Decode(&newAsset); err != nil {
		writeError(w, http.StatusBadRequest, "JSON tidak valid")
		return
	}

	assets := assetio.ReadAsset()

	newID := 1
	if len(assets) > 0 {
		newID = assets[len(assets)-1].AsetID + 1
	}

	newAsset.AsetID = newID
	newAsset.Status = true
	newAsset.QtyReal = newAsset.QtyIn - newAsset.QtyOut
	newAsset.UpdateAt = time.Now()

	assets = append(assets, newAsset)
	assetio.WriteAsset(assets)

	writeJSON(w, http.StatusCreated, newAsset)
}

func putAsset(w http.ResponseWriter, r *http.Request, id int) {
	var updated model.Asset

	if err := json.NewDecoder(r.Body).Decode(&updated); err != nil {
		writeError(w, http.StatusBadRequest, "JSON tidak valid")
		return
	}

	assets := assetio.ReadAsset()

	for i, a := range assets {
		if a.AsetID == id {
			updated.AsetID = id
			updated.QtyReal = updated.QtyIn - updated.QtyOut
			updated.UpdateAt = time.Now()

			assets[i] = updated
			assetio.WriteAsset(assets)

			writeJSON(w, http.StatusOK, updated)
			return
		}
	}

	writeError(w, http.StatusNotFound, "asset tidak ditemukan")
}

func deleteAsset(w http.ResponseWriter, id int) {
	assets := assetio.ReadAsset()

	for i, a := range assets {
		if a.AsetID == id {
			assets = append(assets[:i], assets[i+1:]...)
			assetio.WriteAsset(assets)

			writeJSON(w, http.StatusOK, map[string]string{
				"message": "asset berhasil dihapus",
			})
			return
		}
	}

	writeError(w, http.StatusNotFound, "asset tidak ditemukan")
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{
		"error": message,
	})
}
