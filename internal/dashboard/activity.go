package dashboard

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Activity struct {
	ID           int64     `json:"id"`
	ActivityType string    `json:"activity_type"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"created_at"`
}

var activityMu sync.Mutex

// Menentukan lokasi file JSON.
func getActivityFilePath() string {
	path := os.Getenv("DASHBOARD_ACTIVITY_FILE")

	if path == "" {
		path = filepath.Join("internal", "dashboard", "activities.json")
	}

	return path
}

// Menambahkan aktivitas dan menyimpan maksimal 5 aktivitas terbaru.

func AddActivity(activityType, description string) error {
	activityMu.Lock()
	defer activityMu.Unlock()

	path := getActivityFilePath()

	// Pastikan folder penyimpanan tersedia.
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	var activities []Activity

	// Baca aktivitas yang sudah tersimpan.
	data, err := os.ReadFile(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}

	if err == nil && len(data) > 0 {
		if err := json.Unmarshal(data, &activities); err != nil {
			return fmt.Errorf("gagal membaca aktivitas JSON: %w", err)
		}
	}

	// Buat ID berikutnya.
	var nextID int64 = 1
	for _, activity := range activities {
		if activity.ID >= nextID {
			nextID = activity.ID + 1
		}
	}

	// Buat aktivitas baru.
	newActivity := Activity{
		ID:           nextID,
		ActivityType: activityType,
		Description:  description,
		CreatedAt:    time.Now(),
	}

	// Letakkan aktivitas terbaru di urutan pertama.
	activities = append([]Activity{newActivity}, activities...)

	// Jika lebih dari 5, hapus aktivitas paling lama.
	if len(activities) > 5 {
		activities = activities[:5]
	}

	// Tulis ulang file JSON dengan 5 aktivitas terbaru.
	output, err := json.MarshalIndent(activities, "", "  ")
	if err != nil {
		return err
	}

	if err := os.WriteFile(path, output, 0644); err != nil {
		return err
	}

	log.Printf(
		"[ACTIVITY] Aktivitas tersimpan: %s | Total: %d",
		description,
		len(activities),
	)

	return nil
}

// Membaca maksimal 5 aktivitas terbaru.
func GetActivities() ([]Activity, error) {
	activityMu.Lock()
	defer activityMu.Unlock()

	path := getActivityFilePath()
	log.Printf("[ACTIVITY] Membaca file: %s", path)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("[ACTIVITY] File tidak ditemukan: %s", path)
			return []Activity{}, nil
		}
		return nil, err
	}

	var activities []Activity
	if err := json.Unmarshal(data, &activities); err != nil {
		return nil, err
	}

	log.Printf("[ACTIVITY] Jumlah aktivitas terbaca: %d", len(activities))

	if len(activities) > 5 {
		activities = activities[:5]
	}

	return activities, nil
}
