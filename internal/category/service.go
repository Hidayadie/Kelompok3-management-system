package category

import (
	"context"
	"errors"
	"strings"
)

var (
	ErrInvalidCategory  = errors.New("nama kategori wajib diisi")
	ErrDuplikatCategory = errors.New("kategori sudah ada")
	ErrCategoryNotFound = errors.New("kategori tidak ditemukan")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type ItemInput struct {
	ID   uint   `json:"id"`
	Name string `json:"name" binding:"required"`
}

// Create menambahkan kategori baru.
func (s *Service) Create(
	ctx context.Context,
	items []ItemInput,
) (Category, error) {
	if len(items) == 0 {
		return Category{}, ErrInvalidCategory
	}

	// Validasi nama dan cek duplikat.
	for i := range items {
		items[i].Name = strings.TrimSpace(items[i].Name)

		if items[i].Name == "" {
			return Category{}, ErrInvalidCategory
		}

		exists, err := s.repo.ExistsByName(ctx, items[i].Name)
		if err != nil {
			return Category{}, err
		}

		if exists {
			return Category{}, ErrDuplikatCategory
		}
	}

	return s.repo.Create(ctx, items)
}

// ListCategory mengambil daftar kategori.
func (s *Service) ListCategory(
	ctx context.Context,
	ID int,
) ([]Category, error) {
	return s.repo.ListCategory(ctx, ID)
}

// GetCategoryByID mengambil kategori berdasarkan ID.
func (s *Service) GetCategoryByID(
	ctx context.Context,
	id int,
) (*Category, error) {
	if id <= 0 {
		return nil, ErrCategoryNotFound
	}

	category, err := s.repo.GetCategoryByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if category == nil {
		return nil, ErrCategoryNotFound
	}

	return category, nil
}

// Update memperbarui nama kategori berdasarkan ID.
func (s *Service) Update(
	ctx context.Context,
	id int,
	input ItemInput,
) (Category, error) {
	if id <= 0 {
		return Category{}, ErrCategoryNotFound
	}

	// Validasi nama kategori.
	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		return Category{}, ErrInvalidCategory
	}

	// Pastikan kategori tersedia.
	category, err := s.repo.GetCategoryByID(ctx, id)
	if err != nil {
		return Category{}, err
	}

	if category == nil {
		return Category{}, ErrCategoryNotFound
	}

	// Cek apakah nama sudah digunakan.
	exists, err := s.repo.ExistsByName(ctx, input.Name)
	if err != nil {
		return Category{}, err
	}

	// Izinkan kategori tetap menggunakan namanya sendiri.
	if exists && !strings.EqualFold(
		strings.TrimSpace(category.Name),
		input.Name,
	) {
		return Category{}, ErrDuplikatCategory
	}

	// Perbarui data kategori.
	category.Name = input.Name

	if err := s.repo.Update(ctx, category); err != nil {
		return Category{}, err
	}

	return *category, nil
}

// Delete menghapus kategori berdasarkan ID.
func (s *Service) Delete(
	ctx context.Context,
	id uint,
) error {
	if id == 0 {
		return ErrCategoryNotFound
	}

	deleted, err := s.repo.DeleteCategoryByID(ctx, int(id))
	if err != nil {
		return err
	}

	if !deleted {
		return ErrCategoryNotFound
	}

	return nil
}
