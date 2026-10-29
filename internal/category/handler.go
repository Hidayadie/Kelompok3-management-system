package category

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Create membuat kategori baru.
func (h *Handler) Create(c *gin.Context) {
	var input ItemInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nama kategori wajib diisi",
		})
		return
	}

	items := []ItemInput{
		{
			Name: input.Name,
		},
	}

	category, err := h.service.Create(
		c.Request.Context(),
		items,
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Kategori berhasil dibuat",
		"data":    category,
	})
}

// ListCategory mengambil daftar kategori.
func (h *Handler) ListCategory(c *gin.Context) {
	idParam := c.Query("id")
	id := 0

	if idParam != "" {
		parsedID, err := strconv.Atoi(idParam)
		if err != nil || parsedID < 1 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "ID kategori tidak valid",
			})
			return
		}
		id = parsedID
	}

	categories, err := h.service.ListCategory(
		c.Request.Context(),
		id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal membaca kategori",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": categories,
	})
}

// GetByID mengambil satu kategori berdasarkan ID.
func (h *Handler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID kategori tidak valid",
		})
		return
	}

	category, err := h.service.GetCategoryByID(
		c.Request.Context(),
		id,
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": category,
	})
}

// Update memperbarui kategori berdasarkan ID.
func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID kategori tidak valid",
		})
		return
	}

	var input ItemInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format JSON tidak valid atau nama kategori wajib diisi",
		})
		return
	}

	category, err := h.service.Update(
		c.Request.Context(),
		id,
		input,
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Kategori berhasil diperbarui",
		"data":    category,
	})
}

// Delete menghapus kategori berdasarkan ID.
func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID kategori tidak valid",
		})
		return
	}

	err = h.service.Delete(
		c.Request.Context(),
		uint(id),
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Kategori berhasil dihapus",
	})
}

// handleError menangani error dari service.
func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidCategory):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})

	case errors.Is(err, ErrDuplikatCategory):
		c.JSON(http.StatusConflict, gin.H{
			"error": err.Error(),
		})

	case errors.Is(err, ErrCategoryNotFound):
		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
		})

	default:
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Terjadi kesalahan pada proses kategori",
		})
	}
}
