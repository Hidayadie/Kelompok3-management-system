package location

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Location struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey" json:"location_id"`
	Name        string     `gorm:"type:varchar(100);not null" json:"location_name"`
	Description string     `gorm:"type:text" json:"description"`
	ParentID    *uuid.UUID `gorm:"type:uuid;index" json:"parent_id"`
	IsActive    bool       `gorm:"not null;default:true" json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	Parent *Location `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
}

func (l *Location) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}
