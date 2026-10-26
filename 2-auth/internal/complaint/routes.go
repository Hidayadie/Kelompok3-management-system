package complaint

import (
	"gin-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.RouterGroup, h *Handler) {
	complaints := router.Group("/complaints")
	{
		complaints.POST("", middleware.MockEndpoint("private.complaint.create"), h.Create)
		complaints.GET("", middleware.MockEndpoint("private.complaint.list"), h.FindAll)
		complaints.GET("/:id", middleware.MockEndpoint("private.complaint.findByID"), h.FindByID)
		complaints.PUT("/:id", middleware.MockEndpoint("private.complaint.update"), h.Update)
		complaints.DELETE("/:id", middleware.MockEndpoint("private.complaint.delete"), h.Delete)
	}
}
