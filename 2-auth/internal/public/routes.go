package public

import (
	"net/http"

	"gin-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	group := r.Group("/api/public")
	group.GET("/info", middleware.MockEndpoint("public.info"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"message": "API publik dapat diakses tanpa login"}})
	})
}
