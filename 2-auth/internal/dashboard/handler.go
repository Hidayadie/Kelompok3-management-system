package dashboard

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// GET /dashboard/summary
func (h *Handler) Summary(c *gin.Context) {
	summary, err := h.service.GetSummary(c.Request.Context())
	if err != nil {
		log.Printf("[DASHBOARD SUMMARY ERROR] %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "Gagal mengambil statistik dashboard",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Berhasil mengambil statistik dashboard",
		"data":    summary,
	})
}

// GET /dashboard/lastAsset
func (h *Handler) GetLastAssets(c *gin.Context) {
	assets, err := h.service.GetLastAssets(c.Request.Context())
	if err != nil {
		log.Printf("[DASHBOARD LAST ASSET ERROR] %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "internal_server_error",
			"message": "Gagal mengambil data aset terbaru",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data aset terbaru berhasil diambil",
		"data":    assets,
	})
}

func (h *Handler) GetActivities(c *gin.Context) {
	activities, err := GetActivities()
	if err != nil {
		log.Printf("[DASHBOARD ACTIVITIES ERROR] %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "Gagal mengambil aktivitas terbaru",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Berhasil mengambil aktivitas terbaru",
		"data":    activities,
	})
}
