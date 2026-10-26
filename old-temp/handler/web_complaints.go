package handler

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"project-test/model"
	"project-test/store"
)

// ======================= WEB (HTML) =======================

func (h *Handler) listComplaints(w http.ResponseWriter, r *http.Request) {
	render(w, http.StatusOK, "complaints.html", "Daftar Pengaduan", "complaints",
		data{"Complaints": h.store.Complaints()})
}

func (h *Handler) showComplaint(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		http.NotFound(w, r)
		return
	}
	c, found := h.store.FindComplaint(id)
	if !found {
		http.NotFound(w, r)
		return
	}
	render(w, http.StatusOK, "complaint_detail.html", c.Title, "complaints", data{"Complaint": c})
}

func (h *Handler) newComplaintForm(w http.ResponseWriter, r *http.Request) {
	h.complaintForm(w, http.StatusOK, 0, model.Complaint{Priority: 1, Status: "urgent"}, "")
}

func (h *Handler) editComplaintForm(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		http.NotFound(w, r)
		return
	}
	c, found := h.store.FindComplaint(id)
	if !found {
		http.NotFound(w, r)
		return
	}
	h.complaintForm(w, http.StatusOK, id, c, "")
}

func (h *Handler) createComplaint(w http.ResponseWriter, r *http.Request) {
	c, err := complaintFromForm(r)
	if err == nil {
		err = h.store.ValidateComplaint(c)
	}
	if err != nil {
		h.complaintForm(w, http.StatusBadRequest, 0, c, err.Error())
		return
	}

	if _, err := h.store.AddComplaint(c); err != nil {
		log.Println("save complaint:", err)
		http.Error(w, "gagal menyimpan data", http.StatusInternalServerError)
		return
	}
	http.Redirect(w, r, "/complaints", http.StatusSeeOther)
}

func (h *Handler) updateComplaint(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		http.NotFound(w, r)
		return
	}

	c, err := complaintFromForm(r)
	if err == nil {
		err = h.store.ValidateComplaint(c)
	}
	if err != nil {
		h.complaintForm(w, http.StatusBadRequest, id, c, err.Error())
		return
	}

	_, err = h.store.UpdateComplaint(id, c)
	switch {
	case errors.Is(err, store.ErrNotFound):
		http.NotFound(w, r)
	case err != nil:
		log.Println("update complaint:", err)
		http.Error(w, "gagal menyimpan data", http.StatusInternalServerError)
	default:
		http.Redirect(w, r, fmt.Sprintf("/complaints/%d", id), http.StatusSeeOther)
	}
}

func (h *Handler) deleteComplaint(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r)
	if !ok {
		http.NotFound(w, r)
		return
	}

	err := h.store.DeleteComplaint(id)
	switch {
	case errors.Is(err, store.ErrNotFound):
		http.NotFound(w, r)
	case err != nil:
		log.Println("delete complaint:", err)
		http.Error(w, "gagal menghapus data", http.StatusInternalServerError)
	default:
		http.Redirect(w, r, "/complaints", http.StatusSeeOther)
	}
}

// complaintForm menampilkan form tambah (id == 0) atau edit (id > 0).
// c berisi isian saat ini; errMsg tidak kosong jika validasi sebelumnya gagal.
func (h *Handler) complaintForm(w http.ResponseWriter, status, id int, c model.Complaint, errMsg string) {
	title, action := "Tambah Pengaduan", "/complaints"
	if id > 0 {
		title, action = "Edit Pengaduan", fmt.Sprintf("/complaints/%d", id)
	}
	render(w, status, "complaint_form.html", title, "complaints", data{
		"Complaint": c,
		"Users":     h.store.Users(),
		"Assets":    h.store.Assets(),
		"Statuses":  model.Statuses,
		"Action":    action,
		"IsEdit":    id > 0,
		"Error":     errMsg,
	})
}

// complaintFromForm membaca isian form langsung ke model.Complaint.
func complaintFromForm(r *http.Request) (model.Complaint, error) {
	c := model.Complaint{
		Title:       r.PostFormValue("title"),
		Description: r.PostFormValue("description"),
		Status:      r.PostFormValue("status"),
		Note:        r.PostFormValue("note"),
	}
	var e1, e2, e3 error
	c.UserID, e1 = strconv.Atoi(r.PostFormValue("userID"))
	c.AssetID, e2 = strconv.Atoi(r.PostFormValue("assetID"))
	c.Priority, e3 = strconv.ParseFloat(r.PostFormValue("priority"), 64)
	if e1 != nil || e2 != nil || e3 != nil {
		return c, errors.New("User, asset, dan prioritas harus berupa angka.")
	}
	return c, nil
}
