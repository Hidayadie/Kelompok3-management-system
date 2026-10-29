package complaint

import (
	"fmt"
	"gin-auth/internal/dashboard"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateComplaintRequest

	// Mendukung JSON maupun multipart/form-data dengan field "image".
	imagePath, err := saveComplaintImage(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	if err := c.ShouldBind(&req); err != nil {
		removeComplaintImage(imagePath)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format data tidak valid atau field wajib belum diisi",
		})
		return
	}

	req.ImagePath = imagePath

	result, err := h.service.Create(req)
	if err != nil {
		removeComplaintImage(imagePath)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Catat aktivitas setelah keluhan berhasil dibuat.
	activityDescription := fmt.Sprintf(
		"Membuat keluhan: %s. Deskripsi: %s",
		req.Title,
		req.Description,
	)

	if err := dashboard.AddActivity(
		"complaint_created",
		activityDescription,
	); err != nil {
		log.Printf("Gagal mencatat aktivitas keluhan: %v", err)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Keluhan berhasil dibuat",
		"data":    result,
	})
}

func (h *Handler) FindAll(c *gin.Context) {
	result, err := h.service.FindAll()
	if err != nil {
		log.Printf("ERROR FindAll complaints: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Gagal mengambil data keluhan",
			"detail": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

func (h *Handler) FindByID(c *gin.Context) {
	result, err := h.service.FindByID(c.Param("id"))
	if err != nil {
		if IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Keluhan tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

func (h *Handler) Update(c *gin.Context) {
	var req UpdateComplaintRequest

	// Gambar baru bersifat opsional; jika tidak dikirim,
	// gambar lama dipertahankan sesuai logika service.
	imagePath, err := saveComplaintImage(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	if err := c.ShouldBind(&req); err != nil {
		removeComplaintImage(imagePath)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format data tidak valid atau field wajib belum diisi",
		})
		return
	}

	req.ImagePath = imagePath

	result, err := h.service.Update(c.Param("id"), req)
	if err != nil {
		removeComplaintImage(imagePath)

		if IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Keluhan tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Catat aktivitas setelah keluhan berhasil diperbarui.
	activityDescription := fmt.Sprintf(
		"Memperbarui keluhan: %s. Deskripsi: %s",
		req.Title,
		req.Description,
	)

	if err := dashboard.AddActivity(
		"complaint_updated",
		activityDescription,
	); err != nil {
		log.Printf("Gagal mencatat aktivitas keluhan: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Keluhan berhasil diperbarui",
		"data":    result,
	})
}

func (h *Handler) Delete(c *gin.Context) {
	err := h.service.Delete(c.Param("id"))
	if err != nil {
		if IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Keluhan tidak ditemukan",
			})
			return
		}

		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Keluhan tidak ditemukan",
			})
			return
		}

		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Keluhan berhasil dihapus",
	})
}

func (h *Handler) FindByUserID(c *gin.Context) {
	// Ambil User ID dari query parameter.
	userIDParam := c.Query("userID")

	if userIDParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Parameter userID wajib diisi",
		})
		return
	}

	parsedID, err := strconv.ParseUint(userIDParam, 10, 64)
	if err != nil || parsedID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID harus berupa angka positif",
		})
		return
	}

	result, err := h.service.FindByUserID(uint(parsedID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil data keluhan berdasarkan User ID",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data keluhan berhasil diambil",
		"data":    result,
	})
}
