package complaint

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(c *Complaint) error {
	return r.db.Create(c).Error
}

func (r *Repository) FindAll() ([]Complaint, error) {
	var complaints []Complaint

	err := r.db.Order("created_at DESC").Find(&complaints).Error
	return complaints, err
}

func (r *Repository) FindByID(id uuid.UUID) (*Complaint, error) {
	var complaint Complaint

	err := r.db.First(&complaint, "id = ?", id).Error
	if err != nil {
		return nil, err
	}

	return &complaint, nil
}

func (r *Repository) Update(c *Complaint) error {
	return r.db.Save(c).Error
}

func (r *Repository) Delete(id uuid.UUID) error {
	return r.db.Delete(&Complaint{}, "id = ?", id).Error
}

func (r *Repository) CountByYear(year int) (int64, error) {
	var count int64
	prefix := fmt.Sprintf("CMP-%d-%%", year)

	err := r.db.Model(&Complaint{}).
		Where("code LIKE ?", prefix).
		Count(&count).Error

	return count, err
}
