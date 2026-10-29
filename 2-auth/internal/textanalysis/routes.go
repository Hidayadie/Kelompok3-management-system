package textanalysis

import (
	"gin-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(group *gin.RouterGroup, h *Handler) {
	group.GET(
		"/text-analysis",
		middleware.MockEndpoint("private.dashboard.textAnalysis"),
		h.Analyze,
	)
}
