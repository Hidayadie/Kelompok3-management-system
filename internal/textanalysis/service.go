package textanalysis

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
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
	return &Service{
		repository: repository,
	}
}

func (s *Service) Analyze(
	ctx context.Context,
	source string,
	clusters int,
) (*AnalysisResponse, error) {

	// Validasi sumber analisis.
	source = strings.ToLower(strings.TrimSpace(source))

	if source == "" {
		source = "all"
	}

	if source != "all" &&
		source != "complaints" &&
		source != "damage" {
		return nil, fmt.Errorf(
			"source harus all, complaints, atau damage",
		)
	}

	// Validasi jumlah cluster.
	if clusters < 2 || clusters > 10 {
		return nil, fmt.Errorf(
			"clusters harus antara 2 sampai 10",
		)
	}

	// Ambil data laporan dari repository.
	records, err := s.repository.GetRecords(ctx)
	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengambil data laporan: %w",
			err,
		)
	}

	// Filter berdasarkan sumber dan hilangkan data tanpa teks.
	filtered := make([]TextRecord, 0, len(records))

	for _, record := range records {
		if source != "all" && record.Source != source {
			continue
		}

		text := strings.TrimSpace(
			record.Title + " " + record.Description,
		)

		if text == "" {
			continue
		}

		filtered = append(filtered, record)
	}

	// Jika tidak ada data yang valid untuk dianalisis, kembalikan respons kosong tanpa perlu menjalankan subprocess Python.
	if len(filtered) == 0 {
		return &AnalysisResponse{
			Source:            source,
			TotalReports:      0,
			ClustersRequested: clusters,
			Groups:            []ClusterGroup{},
		}, nil
	}

	// Siapkan request JSON untuk script Python.
	request := AnalysisRequest{
		Source:   source,
		Clusters: clusters,
		Records:  filtered,
	}

	input, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf(
			"gagal mengubah data analisis menjadi JSON: %w",
			err,
		)
	}

	// =====================================================
	// KONFIGURASI PYTHON & SCRIPT
	// =====================================================

	python, err := resolvePythonExecutable()
	if err != nil {
		return nil, err
	}

	log.Printf("[TEXT ANALYSIS DEBUG] Python: %s", python)

	script, err := resolveScriptPath()
	if err != nil {
		return nil, err
	}

	// =====================================================
	// JALANKAN ANALISIS MACHINE LEARNING
	// =====================================================

	cmd := exec.CommandContext(
		ctx,
		python,
		script,
	)

	// Kirim request JSON ke stdin Python.
	cmd.Stdin = bytes.NewReader(input)

	var stdout bytes.Buffer
	var stderr bytes.Buffer

	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Jalankan proses Python.
	if runErr := cmd.Run(); runErr != nil {
		detail := strings.TrimSpace(stderr.String())

		if detail == "" {
			detail = "Python tidak memberikan detail error"
		}

		return nil, fmt.Errorf(
			"analisis Python gagal: %w; detail: %s",
			runErr,
			detail,
		)
	}

	// =====================================================
	// PARSING HASIL PYTHON
	// =====================================================

	var response AnalysisResponse

	if err := json.Unmarshal(
		stdout.Bytes(),
		&response,
	); err != nil {
		return nil, fmt.Errorf(
			"respons Python tidak valid: %w; output: %s",
			err,
			stdout.String(),
		)
	}

	return &response, nil
}

// resolvePythonExecutable mencari executable Python yang valid.
// Prioritas:
// 1. Variabel lingkungan TEXT_ANALYSIS_PYTHON (diverifikasi keberadaannya)
// 2. Virtual environment lokal (.venv / venv)
// 3. Command 'python', 'python3', atau 'py' yang tersedia di PATH sistem
// 4. Direktori instalasi standar Python di Windows
func resolvePythonExecutable() (string, error) {
	// 1. Periksa variabel lingkungan TEXT_ANALYSIS_PYTHON jika disetel
	if custom := strings.TrimSpace(os.Getenv("TEXT_ANALYSIS_PYTHON")); custom != "" {
		if fi, err := os.Stat(custom); err == nil && !fi.IsDir() {
			return custom, nil
		}
		if path, err := exec.LookPath(custom); err == nil {
			return path, nil
		}
		log.Printf("[TEXT ANALYSIS WARNING] TEXT_ANALYSIS_PYTHON terpasang ('%s') tetapi file tidak ditemukan. Mencari alternatif Python di sistem...", custom)
	}

	// 2. Cari di virtual environment lokal
	venvCandidates := []string{
		filepath.Join(".venv", "Scripts", "python.exe"),
		filepath.Join("venv", "Scripts", "python.exe"),
		filepath.Join(".venv", "bin", "python"),
		filepath.Join("venv", "bin", "python"),
		filepath.Join("Kelompok3-management-system", ".venv", "Scripts", "python.exe"),
		filepath.Join("Kelompok3-management-system", "venv", "Scripts", "python.exe"),
	}

	for _, cand := range venvCandidates {
		if fi, err := os.Stat(cand); err == nil && !fi.IsDir() {
			if abs, err := filepath.Abs(cand); err == nil {
				return abs, nil
			}
			return cand, nil
		}
	}

	// 3. Cari di PATH sistem
	for _, name := range []string{"python", "python3", "py"} {
		if path, err := exec.LookPath(name); err == nil {
			return path, nil
		}
	}

	// 4. Cari di direktori instalasi standar Windows
	if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
		pyDirs, _ := filepath.Glob(filepath.Join(localAppData, "Programs", "Python", "Python*", "python.exe"))
		if len(pyDirs) > 0 {
			return pyDirs[len(pyDirs)-1], nil
		}
	}

	if progFiles := os.Getenv("ProgramFiles"); progFiles != "" {
		pyDirs, _ := filepath.Glob(filepath.Join(progFiles, "Python*", "python.exe"))
		if len(pyDirs) > 0 {
			return pyDirs[len(pyDirs)-1], nil
		}
	}

	return "", fmt.Errorf(
		"interpreter Python tidak ditemukan. Pastikan Python sudah terinstal di PATH atau tentukan jalurnya di environment variable TEXT_ANALYSIS_PYTHON",
	)
}

// resolveScriptPath mencari file analyze_text.py yang valid.
func resolveScriptPath() (string, error) {
	if custom := strings.TrimSpace(os.Getenv("TEXT_ANALYSIS_SCRIPT")); custom != "" {
		if fi, err := os.Stat(custom); err == nil && !fi.IsDir() {
			return filepath.Abs(custom)
		}
	}

	candidates := []string{
		filepath.Join("internal", "textanalysis", "analyze_text.py"),
		"analyze_text.py",
		filepath.Join("..", "internal", "textanalysis", "analyze_text.py"),
		filepath.Join("..", "..", "internal", "textanalysis", "analyze_text.py"),
		filepath.Join("Kelompok3-management-system", "internal", "textanalysis", "analyze_text.py"),
	}

	if exe, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(exeDir, "internal", "textanalysis", "analyze_text.py"),
			filepath.Join(exeDir, "..", "internal", "textanalysis", "analyze_text.py"),
		)
	}

	for _, cand := range candidates {
		if fi, err := os.Stat(cand); err == nil && !fi.IsDir() {
			return filepath.Abs(cand)
		}
	}

	// Fallback ke default relative path
	return filepath.Join("internal", "textanalysis", "analyze_text.py"), nil
}

// ParseClusters digunakan jika dibutuhkan oleh handler lain.
func ParseClusters(value string) (int, error) {
	return strconv.Atoi(value)
}
