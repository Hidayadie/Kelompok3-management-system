package complaint

import (
	"net/http"

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

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format JSON tidak valid atau field wajib belum diisi",
		})
		return
	}

	result, err := h.service.Create(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Keluhan berhasil dibuat",
		"data":    result,
	})
}

func (h *Handler) FindAll(c *gin.Context) {
	result, err := h.service.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil data keluhan",
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

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format JSON tidak valid atau field wajib belum diisi",
		})
		return
	}

	result, err := h.service.Update(c.Param("id"), req)
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
