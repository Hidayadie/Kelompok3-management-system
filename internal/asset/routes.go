package asset

import (
	"gin-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(group *gin.RouterGroup, h *Handler) {
	group.POST("/assets", middleware.MockEndpoint("private.asset.create"), h.Create)
	group.GET("/assets", middleware.MockEndpoint("private.asset.list"), h.List)
	group.GET("/assets/:id", middleware.MockEndpoint("private.asset.list"), h.GetByID)
	group.PUT("/assets/:id", middleware.MockEndpoint("private.asset.update"), h.Update)
	group.DELETE("/assets/:id", middleware.MockEndpoint("private.asset.delete"), h.Delete)
}
