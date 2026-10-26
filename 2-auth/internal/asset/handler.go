package asset

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
	case errors.Is(err, ErrInvalidAsset):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})

	case errors.Is(err, ErrDuplicateAssetCode):
		c.JSON(http.StatusConflict, gin.H{
			"error": err.Error(),
		})

	case errors.Is(err, ErrAssetNotFound),
		errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Aset tidak ditemukan",
		})

	case errors.Is(err, ErrInvalidRelation):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})

	default:
		log.Printf("Asset API error: %+v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Terjadi kesalahan pada server",
			"detail": err.Error(),
		})
	}
}

func parseAssetID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		return 0, ErrInvalidAsset
	}
	return uint(id), nil
}

// POST /api/assets
func (h *Handler) Create(c *gin.Context) {
	var input AssetInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format JSON atau data aset tidak valid",
		})
		return
	}

	item, err := h.service.Create(c.Request.Context(), input)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Aset berhasil dibuat",
		"data":    item,
	})
}

// GET /api/assets
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

// GET /api/assets/:id
func (h *Handler) GetByID(c *gin.Context) {
	id, err := parseAssetID(c)
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

// PUT /api/assets/:id
func (h *Handler) Update(c *gin.Context) {
	id, err := parseAssetID(c)
	if err != nil {
		h.handleError(c, err)
		return
	}

	var input AssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format JSON atau data aset tidak valid",
		})
		return
	}

	item, err := h.service.Update(
		c.Request.Context(),
		id,
		input,
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Aset berhasil diperbarui",
		"data":    item,
	})
}

// DELETE /api/assets/:id
func (h *Handler) Delete(c *gin.Context) {
	id, err := parseAssetID(c)
	if err != nil {
		h.handleError(c, err)
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Aset berhasil dihapus",
	})
}
