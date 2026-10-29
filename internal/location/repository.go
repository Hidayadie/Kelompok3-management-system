package location

import (
	"context"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetAllLoc(ctx context.Context) ([]Location, error) {
	var locations []Location

	err := r.db.WithContext(ctx).
		Order("name ASC").
		Find(&locations).Error

	return locations, err
}

func (r *Repository) GetLocByID(
	ctx context.Context,
	id string,
) (Location, error) {
	var location Location

	err := r.db.WithContext(ctx).
		First(&location, "id = ?", id).Error

	return location, err
}

func (r *Repository) Create(
	ctx context.Context,
	location *Location,
) error {
	return r.db.WithContext(ctx).Create(location).Error
}

func (r *Repository) Update(
	ctx context.Context,
	location *Location,
) error {
	return r.db.WithContext(ctx).Save(location).Error
}

func (r *Repository) Delete(
	ctx context.Context,
	id string,
) error {
	result := r.db.WithContext(ctx).
		Delete(&Location{}, "id = ?", id)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

func (r *Repository) HasChildren(
	ctx context.Context,
	id string,
) (bool, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&Location{}).
		Where("parent_id = ?", id).
		Count(&count).Error

	return count > 0, err
}
