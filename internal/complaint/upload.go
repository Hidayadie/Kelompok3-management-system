package complaint

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const maxComplaintImageSize int64 = 5 << 20 // 5 MiB

// saveComplaintImage menerima field multipart bernama "image".
// Jika request JSON atau file tidak disertakan, hasilnya adalah path kosong.
func saveComplaintImage(c *gin.Context) (string, error) {
	if !strings.HasPrefix(strings.ToLower(c.ContentType()), "multipart/form-data") {
		return "", nil
	}

	header, err := c.FormFile("image")
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			return "", nil
		}
		return "", fmt.Errorf("membaca file gambar: %w", err)
	}
	if header.Size > maxComplaintImageSize {
		return "", fmt.Errorf("ukuran gambar maksimal 5 MB")
	}

	source, err := header.Open()
	if err != nil {
		return "", fmt.Errorf("membuka file gambar: %w", err)
	}
	defer source.Close()

	data, err := io.ReadAll(io.LimitReader(source, maxComplaintImageSize+1))
	if err != nil {
		return "", fmt.Errorf("membaca file gambar: %w", err)
	}
	if int64(len(data)) > maxComplaintImageSize {
		return "", fmt.Errorf("ukuran gambar maksimal 5 MB")
	}

	// Memvalidasi konten gambar, bukan hanya ekstensi nama file dari browser.
	config, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("file bukan gambar JPEG, PNG, atau GIF yang valid")
	}
	if config.Width <= 0 || config.Height <= 0 || int64(config.Width)*int64(config.Height) > 40_000_000 {
		return "", fmt.Errorf("dimensi gambar tidak valid atau terlalu besar")
	}

	extension := ""
	switch format {
	case "jpeg":
		extension = ".jpg"
	case "png":
		extension = ".png"
	case "gif":
		extension = ".gif"
	default:
		return "", fmt.Errorf("format gambar tidak didukung; gunakan JPEG, PNG, atau GIF")
	}

	directory := filepath.Join("uploads", "complaints")
	if err := os.MkdirAll(directory, 0755); err != nil {
		return "", fmt.Errorf("membuat folder upload: %w", err)
	}

	filename := uuid.NewString() + extension
	if err := os.WriteFile(filepath.Join(directory, filename), data, 0644); err != nil {
		return "", fmt.Errorf("menyimpan gambar: %w", err)
	}

	// Simpan path relatif di database, bukan absolute path komputer.
	return "/uploads/complaints/" + filename, nil
}

// removeComplaintImage membersihkan file baru ketika penyimpanan database gagal.
func removeComplaintImage(imagePath string) {
	cleanURL := filepath.ToSlash(filepath.Clean("/" + strings.TrimLeft(imagePath, "/")))
	if !strings.HasPrefix(cleanURL, "/uploads/complaints/") {
		return
	}
	diskPath := filepath.FromSlash(strings.TrimPrefix(cleanURL, "/"))
	_ = os.Remove(diskPath)
}
