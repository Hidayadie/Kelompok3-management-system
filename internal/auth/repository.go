package auth

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

func (r *Repository) Create(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *Repository) GetByEmail(ctx context.Context, email string) (User, error) {
	var user User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	return user, err
}

func (r *Repository) GetByID(ctx context.Context, id uint) (User, error) {
	var user User
	err := r.db.WithContext(ctx).First(&user, id).Error
	return user, err
}

func (r *Repository) List(ctx context.Context) ([]User, error) {
	var items []User

	err := r.db.WithContext(ctx).
		Order("id DESC").
		Find(&items).Error

	return items, err
}

func (r *Repository) Update(
	ctx context.Context,
	item *User,
) error {
	return r.db.WithContext(ctx).Save(item).Error
}

func (r *Repository) Delete(
	ctx context.Context,
	id uint,
) error {
	result := r.db.WithContext(ctx).Delete(&User{}, id)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}
