package assetlending

import (
	"errors"
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

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})

	case errors.Is(err, ErrRecordNotFound),
		errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Data peminjaman tidak ditemukan",
		})

	case errors.Is(err, ErrAssetNotFound):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Aset yang dipilih tidak ditemukan",
		})

	case errors.Is(err, ErrUserNotFound):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Pengguna peminjam tidak ditemukan",
		})

	case errors.Is(err, ErrInsufficientStock):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})

	case errors.Is(err, ErrAlreadyReturned):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})

	default:
		log.Printf("AssetLending API error: %+v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Terjadi kesalahan pada server",
			"detail": err.Error(),
		})
	}
}

func parseID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		return 0, ErrInvalidInput
	}
	return uint(id), nil
}

// POST /api/private/asset-lending
func (h *Handler) Create(c *gin.Context) {
	var input CreateLendingInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format JSON atau data peminjaman tidak valid",
		})
		return
	}

	item, err := h.service.Create(c.Request.Context(), input)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Transaksi peminjaman aset berhasil dibuat",
		"data":    item,
	})
}

// GET /api/private/asset-lending
func (h *Handler) List(c *gin.Context) {
	items, err := h.service.List(c.Request.Context())
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
	})
}

// GET /api/private/asset-lending/:id
func (h *Handler) GetByID(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		h.handleError(c, err)
		return
	}

	item, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// PUT /api/private/asset-lending/:id/return
func (h *Handler) ReturnAsset(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		h.handleError(c, err)
		return
	}

	var input ReturnLendingInput
	// ShouldBindJSON opsional jika body kosong
	_ = c.ShouldBindJSON(&input)

	item, err := h.service.ReturnAsset(c.Request.Context(), id, input)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Aset berhasil dikembalikan dan stok telah ditambahkan kembali",
		"data":    item,
	})
}

// PUT /api/private/asset-lending/:id
func (h *Handler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		h.handleError(c, err)
		return
	}

	var input UpdateLendingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format JSON atau data peminjaman tidak valid",
		})
		return
	}

	item, err := h.service.Update(c.Request.Context(), id, input)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data peminjaman berhasil diperbarui",
		"data":    item,
	})
}

// DELETE /api/private/asset-lending/:id
func (h *Handler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		h.handleError(c, err)
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data peminjaman berhasil dihapus",
	})
}
