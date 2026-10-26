package category

import (
	"time"
)

type Category struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null;size:100"`
	CreatedAt time.Time `json:"created_at"`
}
