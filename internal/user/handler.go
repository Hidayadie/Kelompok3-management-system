package user

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

func (h *Handler) List(c *gin.Context) {
	users, err := h.service.List(c.Request.Context())
	if err != nil {
		log.Printf("Gagal mengambil data pengguna: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengambil data pengguna",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data pengguna berhasil diambil",
		"data":    users,
	})
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateUserRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Data pengguna tidak valid",
			"error":   err.Error(),
		})
		return
	}

	result, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		status := http.StatusInternalServerError

		if errors.Is(err, gorm.ErrDuplicatedKey) {
			status = http.StatusConflict
		} else if err.Error() == "email sudah terdaftar" {
			status = http.StatusConflict
		} else if err.Error() == "nama dan email wajib diisi" ||
			err.Error() == "password harus terdiri dari 8 sampai 72 byte" ||
			err.Error() == "role harus admin, teknisi, atau user" {
			status = http.StatusBadRequest
		}

		c.JSON(status, gin.H{
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Pengguna berhasil ditambahkan",
		"data":    result,
	})
}

func (h *Handler) ChangePassword(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "ID pengguna tidak valid",
		})
		return
	}

	var req ChangePasswordRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Password baru wajib diisi, minimal 8 karakter",
		})
		return
	}

	err = h.service.ChangePassword(
		c.Request.Context(),
		uint(id),
		req.NewPassword,
	)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"message": "Pengguna tidak ditemukan atau tidak aktif",
			})
			return
		}

		if err.Error() == "ID pengguna tidak valid" ||
			err.Error() == "password harus terdiri dari 8 sampai 72 byte" {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengubah password",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password berhasil diubah",
	})
}
