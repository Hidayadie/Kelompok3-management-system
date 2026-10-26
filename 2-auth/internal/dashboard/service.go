package dashboard

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetSummary() (*Summary, error) {
	return s.repo.GetSummary()
}
