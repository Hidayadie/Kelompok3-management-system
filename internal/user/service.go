package user

import (
	"context"
	"errors"
	"strings"

	"gin-auth/internal/auth"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Service struct {
	repository *Repository
}

func NewService(repository *Repository) *Service {
	return &Service{repository: repository}
}

func toUserResponse(item auth.User) UserResponse {
	return UserResponse{
		ID:    item.ID,
		Name:  item.Name,
		Email: item.Email,
		Role:  item.Role,
	}
}

func (s *Service) List(ctx context.Context) ([]UserResponse, error) {

	users, err := s.repository.List(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]UserResponse, 0, len(users))

	for _, item := range users {
		result = append(result, toUserResponse(item))
	}

	return result, nil
}

func (s *Service) Create(
	ctx context.Context,
	req CreateUserRequest,
) (*UserResponse, error) {
	name := strings.TrimSpace(req.Name)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	role := strings.ToLower(strings.TrimSpace(req.Role))

	if name == "" || email == "" {
		return nil, errors.New("nama dan email wajib diisi")
	}

	if len(req.Password) < 8 || len(req.Password) > 72 {
		return nil, errors.New("password harus terdiri dari 8 sampai 72 byte")
	}

	if role == "" {
		role = "user"
	}

	switch role {
	case "admin", "teknisi", "user":
	default:
		return nil, errors.New("role harus admin, teknisi, atau user")
	}

	exists, err := s.repository.EmailExists(ctx, email)
	if err != nil {
		return nil, err
	}

	if exists {
		return nil, errors.New("email sudah terdaftar")
	}

	hash, err := bcrypt.GenerateFromPassword(
		[]byte(req.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return nil, err
	}

	item := auth.User{
		Name:     name,
		Email:    email,
		Password: string(hash),
		Role:     role,
	}

	if err := s.repository.Create(ctx, &item); err != nil {
		return nil, err
	}

	response := toUserResponse(item)
	return &response, nil
}

func (s *Service) ChangePassword(
	ctx context.Context,
	id uint,
	newPassword string,
) error {
	if id == 0 {
		return errors.New("ID pengguna tidak valid")
	}

	if len(newPassword) < 8 || len(newPassword) > 72 {
		return errors.New("password harus terdiri dari 8 sampai 72 byte")
	}

	hash, err := bcrypt.GenerateFromPassword(
		[]byte(newPassword),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return err
	}

	return s.repository.UpdatePassword(
		ctx,
		id,
		string(hash),
	)
}

var _ = gorm.ErrRecordNotFound
