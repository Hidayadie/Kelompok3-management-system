package dashboard

import (
	"gin-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(group *gin.RouterGroup, h *Handler) {
	// Dashboard summary
	group.GET(
		"/dashboard/summary",
		middleware.MockEndpoint("private.dashboard.summary"),
		h.Summary,
	)

	// Aset terbaru
	group.GET(
		"/dashboard/lastAsset",
		middleware.MockEndpoint("private.dashboard.lastAsset"),
		h.GetLastAssets,
	)

	//aktivitas
	group.GET(
		"/dashboard/activities",
		middleware.MockEndpoint("private.dashboard.activities"),
		h.GetActivities,
	)
}
