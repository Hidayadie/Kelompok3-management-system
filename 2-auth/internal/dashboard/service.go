package dashboard

import "context"

type Service struct {
	repository *Repository
}

func NewService(repository *Repository) *Service {
	return &Service{
		repository: repository,
	}
}

// GetSummary mengambil statistik dashboard.
func (s *Service) GetSummary(
	ctx context.Context,
) (*Summary, error) {
	return s.repository.GetSummary(ctx)
}

// GetLastAssets mengambil lima aset terbaru.
func (s *Service) GetLastAssets(
	ctx context.Context,
) ([]LastAsset, error) {
	return s.repository.GetLastAssets(ctx, 5)
}
