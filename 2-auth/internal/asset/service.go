package asset

import (
	"context"
	"errors"
	"fmt"
	"gin-auth/internal/category"
	"gin-auth/internal/location"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrInvalidAsset       = errors.New("data aset tidak valid")
	ErrDuplicateAssetCode = errors.New("kode aset sudah digunakan")
	ErrAssetNotFound      = errors.New("aset tidak ditemukan")
	ErrInvalidRelation    = errors.New("kategori atau lokasi tidak valid")
)

type Service struct {
	repo         *Repository
	categoryRepo *category.Repository
	locationRepo *location.Repository
}

func NewService(
	repo *Repository,
	categoryRepo *category.Repository,
	locationRepo *location.Repository,
) *Service {
	return &Service{
		repo:         repo,
		categoryRepo: categoryRepo,
		locationRepo: locationRepo,
	}
}

type AssetInput struct {
	CodeAsset   string    `json:"code_asset" binding:"required"`
	NamaAsset   string    `json:"nama_asset" binding:"required"`
	CategoryID  uint      `json:"category" binding:"required,gt=0"`
	LocationID  uuid.UUID `json:"location" binding:"required"`
	Condition   string    `json:"condition" binding:"required"`
	Status      bool      `json:"status"`
	Description string    `json:"description"`
	QtyIn       int       `json:"qty_in" binding:"gte=0"`
}

func normalizeInput(input *AssetInput) {
	input.CodeAsset = strings.TrimSpace(input.CodeAsset)
	input.NamaAsset = strings.TrimSpace(input.NamaAsset)
	input.Condition = strings.TrimSpace(input.Condition)
	input.Description = strings.TrimSpace(input.Description)
}

func validateInput(input AssetInput) error {
	if input.CodeAsset == "" ||
		input.NamaAsset == "" ||
		input.CategoryID == 0 ||
		input.LocationID == uuid.Nil ||
		input.Condition == "" ||
		input.QtyIn < 0 {
		return ErrInvalidAsset
	}

	return nil
}

func (s *Service) validateRelations(
	ctx context.Context,
	input AssetInput,
) error {
	// Validasi kategori
	_, err := s.categoryRepo.GetCategoryByID(
		ctx,
		int(input.CategoryID),
	)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrInvalidRelation
		}

		return fmt.Errorf("validasi kategori: %w", err)
	}

	// Validasi lokasi
	_, err = s.locationRepo.GetLocByID(
		ctx,
		input.LocationID.String(),
	)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrInvalidRelation
		}

		return fmt.Errorf("validasi lokasi: %w", err)
	}

	return nil
}

func (s *Service) Create(
	ctx context.Context,
	input AssetInput,
) (*Asset, error) {
	normalizeInput(&input)

	if err := validateInput(input); err != nil {
		return nil, err
	}

	if err := s.validateRelations(ctx, input); err != nil {
		return nil, err
	}

	exists, err := s.repo.ExistsByCode(ctx, input.CodeAsset, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrDuplicateAssetCode
	}

	item := &Asset{
		CodeAsset:   input.CodeAsset,
		NamaAsset:   input.NamaAsset,
		CategoryID:  input.CategoryID,
		LocationID:  input.LocationID,
		Condition:   input.Condition,
		Status:      input.Status,
		Description: input.Description,
		QtyIn:       input.QtyIn,
	}

	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, item.AssetID)
}

func (s *Service) List(ctx context.Context) ([]Asset, error) {
	return s.repo.List(ctx)
}

func (s *Service) GetByID(
	ctx context.Context,
	id uint,
) (*Asset, error) {
	if id == 0 {
		return nil, ErrInvalidAsset
	}

	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, ErrAssetNotFound
	}

	return item, nil
}

func (s *Service) Update(
	ctx context.Context,
	id uint,
	input AssetInput,
) (*Asset, error) {
	if id == 0 {
		return nil, ErrInvalidAsset
	}

	normalizeInput(&input)
	if err := validateInput(input); err != nil {
		return nil, err
	}

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if current == nil {
		return nil, ErrAssetNotFound
	}

	if err := s.validateRelations(ctx, input); err != nil {
		return nil, err
	}

	exists, err := s.repo.ExistsByCode(ctx, input.CodeAsset, id)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrDuplicateAssetCode
	}

	updated := &Asset{
		CodeAsset:   input.CodeAsset,
		NamaAsset:   input.NamaAsset,
		CategoryID:  input.CategoryID,
		LocationID:  input.LocationID,
		Condition:   input.Condition,
		Status:      input.Status,
		Description: input.Description,
		QtyIn:       input.QtyIn,
	}

	if err := s.repo.Update(ctx, id, updated); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAssetNotFound
		}
		return nil, err
	}

	return s.repo.GetByID(ctx, id)
}

func (s *Service) Delete(
	ctx context.Context,
	id uint,
) error {
	if id == 0 {
		return ErrInvalidAsset
	}

	err := s.repo.Delete(ctx, id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrAssetNotFound
	}

	return err
}
