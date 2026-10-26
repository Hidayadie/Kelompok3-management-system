package category

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// ExistsByName mengecek nama kategori tanpa membedakan huruf besar/kecil.
func (r *Repository) ExistsByName(
	ctx context.Context,
	name string,
) (bool, error) {
	name = strings.TrimSpace(name)

	if name == "" {
		return false, ErrInvalidCategory
	}

	var count int64

	err := r.db.WithContext(ctx).
		Model(&Category{}).
		Where("LOWER(TRIM(name)) = LOWER(?)", name).
		Count(&count).Error
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// Create menyimpan kategori dalam satu transaksi.
func (r *Repository) Create(
	ctx context.Context,
	items []ItemInput,
) (Category, error) {
	if len(items) == 0 {
		return Category{}, ErrInvalidCategory
	}

	var lastCategory Category

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Mencegah duplikat dalam input yang sama.
		seen := make(map[string]bool)

		for _, item := range items {
			name := strings.TrimSpace(item.Name)
			if name == "" {
				return ErrInvalidCategory
			}

			key := strings.ToLower(name)
			if seen[key] {
				return ErrDuplikatCategory
			}
			seen[key] = true

			// Cek kategori yang sudah tersimpan.
			var count int64
			if err := tx.Model(&Category{}).
				Where("LOWER(TRIM(name)) = ?", key).
				Count(&count).Error; err != nil {
				return err
			}

			if count > 0 {
				return ErrDuplikatCategory
			}

			category := Category{
				Name: name,
			}

			if err := tx.Create(&category).Error; err != nil {
				return err
			}

			lastCategory = category
		}

		return nil
	})

	if err != nil {
		return Category{}, err
	}

	return lastCategory, nil
}

// ListCategory mengambil daftar kategori.
func (r *Repository) ListCategory(
	ctx context.Context,
	id int,
) ([]Category, error) {
	var categories []Category

	query := r.db.WithContext(ctx).
		Model(&Category{}).
		Order("id DESC")

	if id > 0 {
		query = query.Where("id = ?", id)
	}

	if err := query.Find(&categories).Error; err != nil {
		return nil, err
	}

	return categories, nil
}

// GetCategoryByID mengambil satu kategori berdasarkan ID.
func (r *Repository) GetCategoryByID(
	ctx context.Context,
	id int,
) (*Category, error) {
	if id <= 0 {
		return nil, nil
	}

	var category Category

	err := r.db.WithContext(ctx).
		First(&category, id).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return &category, nil
}

// DeleteCategoryByID menghapus kategori berdasarkan ID.
func (r *Repository) DeleteCategoryByID(
	ctx context.Context,
	id int,
) (bool, error) {
	result := r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&Category{})

	if result.Error != nil {
		return false, result.Error
	}

	// RowsAffected = 0 berarti kategori tidak ditemukan.
	if result.RowsAffected == 0 {
		return false, nil
	}

	return true, nil
}

func (r *Repository) Update(
	ctx context.Context,
	category *Category,
) error {
	return r.db.WithContext(ctx).Save(category).Error
}
