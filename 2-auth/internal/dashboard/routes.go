package dashboard

import (
	"gin-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(group *gin.RouterGroup, h *Handler) {
	group.GET("/dashboard/sumamary", middleware.MockEndpoint("private.dashboard.summary"), h.Summary)

}
