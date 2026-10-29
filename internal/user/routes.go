package user

import "github.com/gin-gonic/gin"

func RegisterRoutes(group *gin.RouterGroup, handler *Handler) {
	group.GET("/users", handler.List)
	group.POST("/users", handler.Create)
	group.PUT("/users/:id/password", handler.ChangePassword)
}
