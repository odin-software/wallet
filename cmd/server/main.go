package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/kengru/odin-wallet/internal/handlers"
	appMiddleware "github.com/kengru/odin-wallet/internal/middleware"
	"github.com/kengru/odin-wallet/pkg/database"
)

func main() {
	// Get configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "7009"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/wallet.db"
	}

	sessionSecret := os.Getenv("SESSION_SECRET")
	if sessionSecret == "" {
		sessionSecret = "dev-secret-change-in-production"
	}

	// Initialize database
	db, err := database.Init(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, sessionSecret)
	accountHandler := handlers.NewAccountHandler(db)
	transactionHandler := handlers.NewTransactionHandler(db)

	// Create router
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Auth routes (public)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/logout", authHandler.Logout)
			r.Get("/me", authHandler.Me)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(appMiddleware.Auth(db, sessionSecret))

			// Account routes
			r.Route("/accounts", func(r chi.Router) {
				r.Get("/", accountHandler.List)
				r.Post("/", accountHandler.Create)
				r.Get("/{id}", accountHandler.Get)
				r.Put("/{id}", accountHandler.Update)
				r.Delete("/{id}", accountHandler.Delete)

				// Transaction routes nested under accounts
				r.Get("/{id}/transactions", transactionHandler.ListByAccount)
				r.Post("/{id}/transactions", transactionHandler.Create)
			})

			// Overview route
			r.Get("/overview", accountHandler.Overview)

			// Recent transactions across all accounts
			r.Get("/transactions/recent", transactionHandler.Recent)
		})
	})

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Serve frontend static files
	// Try to find frontend dist directory
	frontendPath := "./frontend/dist"

	// Check if running from cmd/server directory (development)
	if _, err := os.Stat(frontendPath); os.IsNotExist(err) {
		// Try relative to executable
		execPath, _ := os.Executable()
		execDir := filepath.Dir(execPath)
		frontendPath = filepath.Join(execDir, "frontend", "dist")
	}

	// Create file server for SPA
	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		// Get the absolute path to prevent directory traversal
		path := filepath.Join(frontendPath, filepath.Clean(req.URL.Path))

		// Check if file exists
		info, err := os.Stat(path)
		if os.IsNotExist(err) || info.IsDir() {
			// Serve index.html for SPA routing
			http.ServeFile(w, req, filepath.Join(frontendPath, "index.html"))
			return
		}

		// Serve the actual file
		http.FileServer(http.Dir(frontendPath)).ServeHTTP(w, req)
	})

	log.Printf("Starting Odin Wallet server on port %s", port)
	log.Printf("Serving frontend from: %s", frontendPath)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
