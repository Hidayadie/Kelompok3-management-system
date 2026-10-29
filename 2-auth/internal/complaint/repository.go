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

	err := r.db.
		Preload("User").
		Preload("Asset").
		Preload("Asset.Location").
		Order("created_at DESC").
		Find(&complaints).Error

	if err != nil {
		return nil, err
	}

	return complaints, nil
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

func (r *Repository) FindByUserID(userID uint) ([]Complaint, error) {
	var complaints []Complaint

	err := r.db.
		Preload("User").
		Preload("Asset").
		Preload("Asset.Location").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&complaints).Error

	if err != nil {
		return nil, err
	}

	return complaints, nil
}

func (r *Repository) GenerateUniqueCode(year int) (string, error) {
	var lastCode string

	prefix := fmt.Sprintf("CMP-%d-", year)

	err := r.db.
		Model(&Complaint{}).
		Where("code LIKE ?", prefix+"%").
		Order("code DESC").
		Limit(1).
		Pluck("code", &lastCode).Error

	if err != nil && err != gorm.ErrRecordNotFound {
		return "", err
	}

	nextNumber := 1

	if lastCode != "" {
		var lastNumber int

		_, err := fmt.Sscanf(lastCode, "CMP-%d-%d", new(int), &lastNumber)
		if err != nil {
			return "", fmt.Errorf("gagal membaca kode complaint terakhir %q: %w", lastCode, err)
		}

		nextNumber = lastNumber + 1
	}

	return fmt.Sprintf("CMP-%d-%03d", year, nextNumber), nil
}
