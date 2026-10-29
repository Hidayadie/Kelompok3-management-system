package main

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gin-auth/internal/asset"
	"gin-auth/internal/assetbroken"
	"gin-auth/internal/assetlending"
	"gin-auth/internal/auth"
	"gin-auth/internal/category"
	"gin-auth/internal/complaint"
	"gin-auth/internal/dashboard"
	"gin-auth/internal/database"
	"gin-auth/internal/location"
	"gin-auth/internal/private"
	"gin-auth/internal/public"
	"gin-auth/internal/textanalysis"
	"gin-auth/internal/user"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

func setupEngine(db *gorm.DB, secret []byte) *gin.Engine {
	r := gin.Default()
	r.MaxMultipartMemory = 8 << 20

	// Sajikan gambar hasil upload.
	r.Static("/uploads", "uploads")

	allowedOrigins := []string{"http://localhost:8081"}
	if customOrigin := os.Getenv("ALLOWED_ORIGIN"); customOrigin != "" {
		allowedOrigins = append(allowedOrigins, customOrigin)
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.Use(func(c *gin.Context) {
		// Batas request JSON dan multipart upload.
		limit := int64(1 << 20)

		if strings.HasPrefix(
			strings.ToLower(c.ContentType()),
			"multipart/form-data",
		) {
			limit = 6 << 20
		}

		c.Request.Body = http.MaxBytesReader(
			c.Writer,
			c.Request.Body,
			limit,
		)

		c.Next()
	})

	// =========================
	// AUTH
	// =========================
	authRepo := auth.NewRepository(db)
	authService := auth.NewService(authRepo, secret)
	authHandler := auth.NewHandler(authService)

	auth.RegisterRoutes(r, authHandler)

	// =========================
	// PUBLIC ROUTES
	// =========================
	public.RegisterRoutes(r)

	// Repository auth digunakan kembali oleh
	// middleware dan modul peminjaman aset.
	repo := auth.NewRepository(db)
	service := auth.NewService(repo, secret)
	handler := auth.NewHandler(service)

	// =========================
	// CATEGORY
	// =========================
	categoryRepo := category.NewRepository(db)
	categoryService := category.NewService(categoryRepo)
	categoryHandler := category.NewHandler(categoryService)

	// =========================
	// LOCATION
	// =========================
	locationRepo := location.NewRepository(db)
	locationService := location.NewService(locationRepo)
	locationHandler := location.NewHandler(locationService)

	// =========================
	// ASSET
	// =========================
	assetRepo := asset.NewRepository(db)
	assetService := asset.NewService(
		assetRepo,
		categoryRepo,
		locationRepo,
	)
	assetHandler := asset.NewHandler(assetService)

	// =========================
	// DASHBOARD
	// =========================
	dashboardRepo := dashboard.NewRepository(db)
	dashboardService := dashboard.NewService(dashboardRepo)
	dashboardHandler := dashboard.NewHandler(dashboardService)

	// =========================
	// COMPLAINT
	// =========================
	complaintRepo := complaint.NewRepository(db)
	complaintService := complaint.NewService(complaintRepo)
	complaintHandler := complaint.NewHandler(complaintService)

	// =========================
	// ASSET BROKEN
	// =========================
	assetBrokenRepo := assetbroken.NewRepository(db)
	assetBrokenService := assetbroken.NewService(
		assetBrokenRepo,
		assetRepo,
	)
	assetBrokenHandler := assetbroken.NewHandler(assetBrokenService)

	// =========================
	// ASSET LENDING
	// =========================
	assetLendingRepo := assetlending.NewRepository(db)
	assetLendingService := assetlending.NewService(
		assetLendingRepo,
		assetRepo,
		repo,
	)
	assetLendingHandler := assetlending.NewHandler(assetLendingService)

	// =========================
	// USER
	// =========================
	userRepo := user.NewRepository(db)
	userService := user.NewService(userRepo)
	userHandler := user.NewHandler(userService)

	// =========================
	// TEXT ANALYSIS: TF-IDF + K-MEANS
	// =========================
	textAnalysisRepo := textanalysis.NewRepository(db)
	textAnalysisService := textanalysis.NewService(textAnalysisRepo)
	textAnalysisHandler := textanalysis.NewHandler(textAnalysisService)

	// =========================
	// PRIVATE ROUTES
	// =========================
	private.RegisterRoutes(
		r,
		handler.AuthReq(),
		categoryHandler,
		locationHandler,
		assetHandler,
		dashboardHandler,
		complaintHandler,
		assetBrokenHandler,
		assetLendingHandler,
		userHandler,
		textAnalysisHandler,
	)

	// =========================
	// STATIC FRONTEND FILES
	// =========================
	r.Static("/client", "./frontend/client")
	r.StaticFile("/", "./frontend/index.html")
	r.StaticFile("/index.html", "./frontend/index.html")
	r.StaticFile("/login", "./frontend/login.html")
	r.StaticFile("/login.html", "./frontend/login.html")
	r.StaticFile("/register", "./frontend/register.html")
	r.StaticFile("/register.html", "./frontend/register.html")
	r.StaticFile("/contoh.html", "./frontend/contoh.html")

	// Fallback untuk file statis di folder frontend atau pesan 404
	r.NoRoute(func(c *gin.Context) {
		path := filepath.Clean(c.Request.URL.Path)
		target := filepath.Join("frontend", path)
		if fi, err := os.Stat(target); err == nil && !fi.IsDir() {
			c.File(target)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Halaman tidak ditemukan"})
	})

	return r
}

func run() error {
	if err := godotenv.Load(); err != nil &&
		!errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("load .env: %w", err)
	}

	secret := []byte(os.Getenv("JWT_SECRET"))
	if len(secret) < 32 {
		return fmt.Errorf("JWT_SECRET wajib diisi minimal 32 byte")
	}

	db, err := database.Open(os.Getenv("DATABASE_URL"))
	if err != nil {
		return fmt.Errorf("buka database: %w", err)
	}

	conn, err := db.DB()
	if err != nil {
		return err
	}
	defer conn.Close()

	// Migrasi tabel secara bertahap.
	migrations := []struct {
		name  string
		model interface{}
	}{
		{"users", &auth.User{}},
		{"locations", &location.Location{}},
		{"categories", &category.Category{}},
		{"assets", &asset.Asset{}},
		{"complaints", &complaint.Complaint{}},
		{"asset_rusak", &assetbroken.AssetRusak{}},
		{"asset_lending", &assetlending.LendingAsset{}},
	}

	for _, migration := range migrations {
		log.Printf("Memulai migrasi model: %s", migration.name)

		if err := db.AutoMigrate(migration.model); err != nil {
			log.Printf(
				"Detail error migrasi %s: %v",
				migration.name,
				err,
			)

			return fmt.Errorf(
				"migrasi model %s gagal: %w",
				migration.name,
				err,
			)
		}

		log.Printf("Migrasi model %s berhasil", migration.name)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           setupEngine(db, secret),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("Server berjalan di http://localhost:%s", port)
	return server.ListenAndServe()
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
