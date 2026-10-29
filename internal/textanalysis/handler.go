package textanalysis

import (
	"log"
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

// GET /text-analysis?source=all&clusters=3
func (h *Handler) Analyze(c *gin.Context) {
	source := c.DefaultQuery("source", "all")

	clusters := 3
	if value := c.Query("clusters"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"message": "Parameter clusters harus berupa angka",
			})
			return
		}
		clusters = parsed
	}

	result, err := h.service.Analyze(
		c.Request.Context(),
		source,
		clusters,
	)
	if err != nil {
		log.Printf("[TEXT ANALYSIS ERROR] %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal melakukan analisis teks",
			"detail":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Analisis teks berhasil dilakukan",
		"data":    result,
	})
}
