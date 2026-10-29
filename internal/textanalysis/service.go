package textanalysis

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

type Service struct {
	repository *Repository
}

func NewService(repository *Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) Analyze(
	ctx context.Context,
	source string,
	clusters int,
) (*AnalysisResponse, error) {
	source = strings.ToLower(strings.TrimSpace(source))

	if source == "" {
		source = "all"
	}

	if source != "all" &&
		source != "complaints" &&
		source != "damage" {
		return nil, fmt.Errorf("source harus all, complaints, atau damage")
	}

	if clusters < 2 || clusters > 10 {
		return nil, fmt.Errorf("clusters harus antara 2 sampai 10")
	}

	records, err := s.repository.GetRecords(ctx)
	if err != nil {
		return nil, fmt.Errorf("gagal mengambil data laporan: %w", err)
	}

	// Filter sumber dan hilangkan record tanpa teks.
	filtered := make([]TextRecord, 0, len(records))
	for _, record := range records {
		if source != "all" && record.Source != source {
			continue
		}

		text := strings.TrimSpace(record.Title + " " + record.Description)
		if text == "" {
			continue
		}

		filtered = append(filtered, record)
	}

	request := AnalysisRequest{
		Source:   source,
		Clusters: clusters,
		Records:  filtered,
	}

	input, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	python := os.Getenv("TEXT_ANALYSIS_PYTHON")
	if python == "" {
		python = `C:\Users\User\OneDrive\Documents\Pelatihan BLKPP\FP-Sistem Inventory\.venv\Scripts\python.exe`
	}

	script := os.Getenv("TEXT_ANALYSIS_SCRIPT")
	if script == "" {
		script = filepath.Join(
			"internal",
			"textanalysis",
			"analyze_text.py",
		)
	}

	cmd := exec.CommandContext(ctx, python, script)
	cmd.Stdin = bytes.NewReader(input)

	var stdout bytes.Buffer
	var stderr bytes.Buffer

	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf(
			"analisis Python gagal: %w; detail: %s",
			err,
			strings.TrimSpace(stderr.String()),
		)
	}

	var response AnalysisResponse
	if err := json.Unmarshal(stdout.Bytes(), &response); err != nil {
		return nil, fmt.Errorf(
			"respons Python tidak valid: %w; output: %s",
			err,
			stdout.String(),
		)
	}

	return &response, nil
}

// ParseClusters digunakan jika dibutuhkan oleh handler lain.
func ParseClusters(value string) (int, error) {
	return strconv.Atoi(value)
}
