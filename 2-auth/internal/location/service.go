package location

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrInvalidInput    = errors.New("data lokasi tidak valid")
	ErrInvalidParent   = errors.New("lokasi induk tidak valid")
	ErrLocationHasData = errors.New("lokasi masih memiliki lokasi turunan")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type LocationInput struct {
	Name        string     `json:"location_name"`
	Description string     `json:"description"`
	ParentID    *uuid.UUID `json:"parent_id"`
	IsActive    *bool      `json:"is_active"`
}

func (s *Service) GetAllLoc(
	ctx context.Context,
) ([]Location, error) {
	return s.repo.GetAllLoc(ctx)
}

func (s *Service) GetLocByID(
	ctx context.Context,
	id string,
) (Location, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Location{}, ErrInvalidInput
	}

	return s.repo.GetLocByID(ctx, id)
}

func (s *Service) Create(
	ctx context.Context,
	input LocationInput,
) (Location, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)

	if input.Name == "" {
		return Location{}, ErrInvalidInput
	}

	if input.ParentID != nil {
		parent, err := s.repo.GetLocByID(ctx, input.ParentID.String())
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return Location{}, ErrInvalidParent
			}
			return Location{}, err
		}
		_ = parent
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	location := Location{
		Name:        input.Name,
		Description: input.Description,
		ParentID:    input.ParentID,
		IsActive:    isActive,
	}

	if err := s.repo.Create(ctx, &location); err != nil {
		return Location{}, err
	}

	return location, nil
}

func (s *Service) Update(
	ctx context.Context,
	id string,
	input LocationInput,
) (Location, error) {
	if _, err := uuid.Parse(id); err != nil {
		return Location{}, ErrInvalidInput
	}

	location, err := s.repo.GetLocByID(ctx, id)
	if err != nil {
		return Location{}, err
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)

	if input.Name == "" {
		return Location{}, ErrInvalidInput
	}

	if input.ParentID != nil {
		if input.ParentID.String() == id {
			return Location{}, ErrInvalidParent
		}

		_, err := s.repo.GetLocByID(ctx, input.ParentID.String())
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return Location{}, ErrInvalidParent
			}
			return Location{}, err
		}
	}

	location.Name = input.Name
	location.Description = input.Description
	location.ParentID = input.ParentID

	if input.IsActive != nil {
		location.IsActive = *input.IsActive
	}

	if err := s.repo.Update(ctx, &location); err != nil {
		return Location{}, err
	}

	return location, nil
}

func (s *Service) Delete(
	ctx context.Context,
	id string,
) error {
	if _, err := uuid.Parse(id); err != nil {
		return ErrInvalidInput
	}

	_, err := s.repo.GetLocByID(ctx, id)
	if err != nil {
		return err
	}

	hasChildren, err := s.repo.HasChildren(ctx, id)
	if err != nil {
		return err
	}
	if hasChildren {
		return ErrLocationHasData
	}

	return s.repo.Delete(ctx, id)
}
