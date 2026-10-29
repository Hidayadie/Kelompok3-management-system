package location

import (
	"errors"
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

func (h *Handler) GetAllLoc(c *gin.Context) {
	locations, err := h.service.GetAllLoc(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil data lokasi",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": locations,
	})
}

func (h *Handler) GetLocByID(c *gin.Context) {
	location, err := h.service.GetLocByID(
		c.Request.Context(),
		c.Param("id"),
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": location,
	})
}

func (h *Handler) Create(c *gin.Context) {
	var input LocationInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format JSON tidak valid",
		})
		return
	}

	location, err := h.service.Create(
		c.Request.Context(),
		input,
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Lokasi berhasil ditambahkan",
		"data":    location,
	})
}

func (h *Handler) Update(c *gin.Context) {
	var input LocationInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format JSON tidak valid",
		})
		return
	}

	location, err := h.service.Update(
		c.Request.Context(),
		c.Param("id"),
		input,
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Lokasi berhasil diperbarui",
		"data":    location,
	})
}

func (h *Handler) Delete(c *gin.Context) {
	err := h.service.Delete(
		c.Request.Context(),
		c.Param("id"),
	)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Lokasi berhasil dihapus",
	})
}

func (h *Handler) handleError(c *gin.Context, err error) {

	switch {
	case errors.Is(err, ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ID atau data lokasi tidak valid",
		})

	case errors.Is(err, ErrInvalidParent):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Lokasi induk tidak valid",
		})

	case errors.Is(err, ErrLocationHasData):
		c.JSON(http.StatusConflict, gin.H{
			"error": "Lokasi masih memiliki lokasi turunan",
		})

	case errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Lokasi tidak ditemukan",
		})

	default:
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Terjadi kesalahan pada server",
		})
	}
}
