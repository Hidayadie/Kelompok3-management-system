package assetbroken

import (
	"gin-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(group *gin.RouterGroup, h *Handler) {
	group.POST("/asset-broken", middleware.MockEndpoint("private.asset-broken.create"), h.Create)
	group.GET("/asset-broken", middleware.MockEndpoint("private.asset-broken.list"), h.List)
	group.GET("/asset-broken/:id", middleware.MockEndpoint("private.asset-broken.getByID"), h.GetByID)
	group.PUT("/asset-broken/:id", middleware.MockEndpoint("private.asset-broken.update"), h.Update)
	group.DELETE("/asset-broken/:id", middleware.MockEndpoint("private.asset-broken.delete"), h.Delete)
}
