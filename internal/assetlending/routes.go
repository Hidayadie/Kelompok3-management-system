package assetlending

import (
	"gin-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(group *gin.RouterGroup, h *Handler) {
	group.POST("/asset-lending", middleware.MockEndpoint("private.asset-lending.create"), h.Create)
	group.GET("/asset-lending", middleware.MockEndpoint("private.asset-lending.list"), h.List)
	group.GET("/asset-lending/:id", middleware.MockEndpoint("private.asset-lending.getByID"), h.GetByID)
	group.PUT("/asset-lending/:id", middleware.MockEndpoint("private.asset-lending.update"), h.Update)
	group.PUT("/asset-lending/:id/return", middleware.MockEndpoint("private.asset-lending.return"), h.ReturnAsset)
	group.DELETE("/asset-lending/:id", middleware.MockEndpoint("private.asset-lending.delete"), h.Delete)
}
