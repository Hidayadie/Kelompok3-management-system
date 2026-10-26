package complaint

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service struct {
	repository *Repository
}

func NewService(repository *Repository) *Service {
	return &Service{repository: repository}
}

type CreateComplaintRequest struct {
	UserID      uint    `json:"userID" binding:"required"`
	AssetID     uint    `json:"assetID" binding:"required"`
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description" binding:"required"`
	Priority    float64 `json:"priority"`
	Status      string  `json:"status"`
	Note        string  `json:"note"`
}

type UpdateComplaintRequest struct {
	UserID      uint    `json:"userID" binding:"required"`
	AssetID     uint    `json:"assetID" binding:"required"`
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description" binding:"required"`
	Priority    float64 `json:"priority"`
	Status      string  `json:"status" binding:"required"`
	Note        string  `json:"note"`
	IsFixed     bool    `json:"is_fixed"`
}

func (s *Service) Create(req CreateComplaintRequest) (*Complaint, error) {
	if req.Priority < 0 || req.Priority > 1 {
		return nil, errors.New("priority harus antara 0 dan 1")
	}

	status := req.Status
	if status == "" {
		status = "low"
	}

	if status != "low" && status != "medium" &&
		status != "high" && status != "critical" {
		return nil, errors.New("status harus low, medium, high, atau critical")
	}

	now := time.Now()
	year := now.Year()

	count, err := s.repository.CountByYear(year)
	if err != nil {
		return nil, err
	}

	c := &Complaint{
		ID:          uuid.New(),
		Code:        fmt.Sprintf("CMP-%d-%03d", year, count+1),
		UserID:      req.UserID,
		AssetID:     req.AssetID,
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		Status:      status,
		Note:        req.Note,
		IsFixed:     false,
	}

	if err := s.repository.Create(c); err != nil {
		return nil, err
	}

	return c, nil
}

func (s *Service) FindAll() ([]Complaint, error) {
	return s.repository.FindAll()
}

func (s *Service) FindByID(id string) (*Complaint, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, errors.New("format UUID tidak valid")
	}

	return s.repository.FindByID(uid)
}

func (s *Service) Update(id string, req UpdateComplaintRequest) (*Complaint, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, errors.New("format UUID tidak valid")
	}

	if req.Priority < 0 || req.Priority > 1 {
		return nil, errors.New("priority harus antara 0 dan 1")
	}

	if req.Status != "low" && req.Status != "medium" &&
		req.Status != "high" && req.Status != "critical" {
		return nil, errors.New("status harus low, medium, high, atau critical")
	}

	c, err := s.repository.FindByID(uid)
	if err != nil {
		return nil, err
	}

	c.UserID = req.UserID
	c.AssetID = req.AssetID
	c.Title = req.Title
	c.Description = req.Description
	c.Priority = req.Priority
	c.Status = req.Status
	c.Note = req.Note
	c.IsFixed = req.IsFixed

	if c.IsFixed {
		c.Status = "resolved"
	}

	if err := s.repository.Update(c); err != nil {
		return nil, err
	}

	return c, nil
}

func (s *Service) Delete(id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return errors.New("format UUID tidak valid")
	}

	c, err := s.repository.FindByID(uid)
	if err != nil {
		return err
	}

	return s.repository.Delete(c.ID)
}

// Mempermudah handler membedakan data tidak ditemukan.
func IsNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}
