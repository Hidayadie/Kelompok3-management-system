package user

import (
	"context"
	"errors"

	"gin-auth/internal/auth"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) List(ctx context.Context) ([]auth.User, error) {
	var users []auth.User

	err := r.db.WithContext(ctx).
		Order("id ASC").
		Find(&users).Error

	return users, err
}

func (r *Repository) GetByEmail(
	ctx context.Context,
	email string,
) (*auth.User, error) {
	var item auth.User

	err := r.db.WithContext(ctx).
		Where("email = ?", email).
		First(&item).Error

	if err != nil {
		return nil, err
	}

	return &item, nil
}

func (r *Repository) Create(
	ctx context.Context,
	item *auth.User,
) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *Repository) UpdatePassword(
	ctx context.Context,
	id uint,
	passwordHash string,
) error {
	result := r.db.WithContext(ctx).
		Model(&auth.User{}).
		Where("id = ?", id).
		Update("password", passwordHash)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}

func (r *Repository) EmailExists(
	ctx context.Context,
	email string,
) (bool, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&auth.User{}).
		Where("email = ?", email).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

var _ = errors.Is
