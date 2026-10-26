package dashboard

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Summary(c *gin.Context) {
	data, err := h.service.GetSummary()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Gagal mengambil ringkasan dashboard",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": data,
	})
}
