package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(c *gin.Context) {
	var input struct {
		Name string `json:"name" binding:"required,max=100"`
		credentials
		Role string `json:"role" binding:"required,oneof=admin teknisi user"`
	}

	if err := c.ShouldBindJSON(&input); err != nil ||
		len(input.Password) > 72 ||
		strings.TrimSpace(input.Name) == "" {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Nama wajib diisi, email harus valid, password minimal 8 karakter dan maksimal 72 byte, role harus admin, teknisi, atau user",
		})
		return
	}

	user, err := h.service.Register(
		c.Request.Context(),
		input.Name,
		input.Email,
		input.Password,
		input.Role,
	)

	if errors.Is(err, gorm.ErrDuplicatedKey) || errors.Is(err, ErrDuplicateEmail) {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Email sudah terdaftar",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal menyimpan pengguna",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registrasi berhasil",
		"data":    user,
	})
}

func (h *Handler) Login(c *gin.Context) {
	var input credentials
	if err := c.ShouldBindJSON(&input); err != nil || len(input.Password) > 72 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email atau format password tidak valid"})
		return
	}
	token, err := h.service.Login(c.Request.Context(), input.Email, input.Password)
	if errors.Is(err, ErrInvalidCredentials) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses login"})
		return
	}
	setAuthCookie(c, token, 3600)

	c.JSON(http.StatusOK, gin.H{
		"message": "Login berhasil",
		"token":   token,
	})
}

func (h *Handler) Me(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": c.MustGet("user")})
}

/* func (h *Handler) Me(c *gin.Context) {
	userValue, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Pengguna belum terautentikasi",
		})
		return
	}

	user, ok := userValue.(*User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Data pengguna tidak valid",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":    user.ID,
		"email": user.Email,
		"role":  user.Role,
	})
} */

func setAuthCookie(c *gin.Context, token string, maxAge int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("access_token", token, maxAge, "/", "", c.Request.TLS != nil, true)
}

func (h *Handler) Logout(c *gin.Context) {
	setAuthCookie(c, "", -1)
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "Sudah keluar"}})
}
