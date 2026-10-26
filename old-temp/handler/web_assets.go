package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"project-test/model"
)

// ======================= WEB (HTML) =======================

func (h *Handler) listAssets(w http.ResponseWriter, r *http.Request) {
	render(w, http.StatusOK, "assets.html", "Daftar Asset", "assets",
		data{"Assets": h.store.Assets()})
}

func (h *Handler) newAssetForm(w http.ResponseWriter, r *http.Request) {
	h.assetForm(w, http.StatusOK, model.AssetInput{Status: true}, "")
}

func (h *Handler) createAsset(w http.ResponseWriter, r *http.Request) {
	in, err := assetFromForm(r)
	if err == nil {
		err = h.store.ValidateAsset(in)
	}
	if err != nil {
		h.assetForm(w, http.StatusBadRequest, in, err.Error())
		return
	}

	if _, err := h.store.AddAsset(in); err != nil {
		log.Println("save asset:", err)
		http.Error(w, "gagal menyimpan data", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, "/assets", http.StatusSeeOther)
}

func (h *Handler) assetForm(w http.ResponseWriter, status int, in model.AssetInput, errMsg string) {
	render(w, status, "asset_form.html", "Tambah Aset", "assets", data{
		"Input":      in,
		"Categories": model.Categories,
		"Locations":  model.Locations,
		"Conditions": model.Conditions,
		"Error":      errMsg,
	})
}

// assetFromForm membaca isian form langsung ke model.AssetInput.
func assetFromForm(r *http.Request) (model.AssetInput, error) {
	in := model.AssetInput{
		CodeAset:    r.PostFormValue("codeAset"),
		NameAsset:   r.PostFormValue("nameAsset"),
		Condition:   r.PostFormValue("condition"),
		Description: r.PostFormValue("description"),
	}
	var e1, e2, e3, e4 error
	in.CategoryID, e1 = strconv.Atoi(r.PostFormValue("categoryID"))
	in.LocationID, e2 = strconv.Atoi(r.PostFormValue("locationID"))
	in.QtyIn, e3 = strconv.Atoi(r.PostFormValue("qtyIn"))
	in.Status, e4 = strconv.ParseBool(r.PostFormValue("status"))
	if e1 != nil || e2 != nil || e3 != nil || e4 != nil {
		return in, errors.New("Kategori, lokasi, jumlah masuk, dan status harus diisi dengan benar.")
	}
	return in, nil
}
