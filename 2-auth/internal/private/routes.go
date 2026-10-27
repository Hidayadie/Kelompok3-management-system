package private

import (
	"net/http"

	"gin-auth/internal/asset"
	"gin-auth/internal/assetbroken"
	"gin-auth/internal/assetlending"
	"gin-auth/internal/category"
	"gin-auth/internal/complaint"
	"gin-auth/internal/dashboard"
	"gin-auth/internal/location"
	"gin-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(
	r *gin.Engine,
	requireAuth gin.HandlerFunc,
	categoryHandler *category.Handler,
	locationHandler *location.Handler,
	assetHandler *asset.Handler,
	dashboardHandler *dashboard.Handler,
	complaintHandler *complaint.Handler,
	assetBrokenHandler *assetbroken.Handler,
	assetLendingHandler *assetlending.Handler,
) {
	group := r.Group("/api/private")
	group.Use(requireAuth)

	category.RegisterRoutes(group, categoryHandler)
	location.RegisterRoutes(group, locationHandler)
	asset.RegisterRoutes(group, assetHandler)
	dashboard.RegisterRoutes(group, dashboardHandler)
	complaint.RegisterRoutes(group, complaintHandler)
	assetbroken.RegisterRoutes(group, assetBrokenHandler)
	assetlending.RegisterRoutes(group, assetLendingHandler)

	group.GET("/profile",
		middleware.MockEndpoint("private.profile"),
		func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"data": c.MustGet("user"),
			})
		},
	)
}
