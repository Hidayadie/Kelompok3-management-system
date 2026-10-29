package textanalysis

import (
	"context"
	"os"
	"testing"
)

func TestResolvePythonExecutable(t *testing.T) {
	// Tes resolusi python
	python, err := resolvePythonExecutable()
	if err != nil {
		t.Logf("resolvePythonExecutable error (acceptable if no python installed): %v", err)
	} else {
		t.Logf("Found python executable: %s", python)
		if _, err := os.Stat(python); err != nil {
			t.Errorf("Resolved python path does not exist: %v", err)
		}
	}
}

func TestResolveScriptPath(t *testing.T) {
	script, err := resolveScriptPath()
	if err != nil {
		t.Fatalf("resolveScriptPath failed: %v", err)
	}
	t.Logf("Found script path: %s", script)
	if _, err := os.Stat(script); err != nil {
		t.Errorf("Resolved script path does not exist: %v", err)
	}
}

func TestAnalyzeValidation(t *testing.T) {
	s := NewService(nil)

	// Validasi source
	_, err := s.Analyze(context.Background(), "invalid_source", 3)
	if err == nil {
		t.Errorf("expected error for invalid source, got nil")
	}

	// Validasi clusters
	_, err = s.Analyze(context.Background(), "all", 1)
	if err == nil {
		t.Errorf("expected error for clusters < 2, got nil")
	}

	_, err = s.Analyze(context.Background(), "all", 11)
	if err == nil {
		t.Errorf("expected error for clusters > 10, got nil")
	}
}
