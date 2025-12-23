.PHONY: dev dev-build build run clean frontend-build frontend-install

# Install frontend dependencies
frontend-install:
	cd frontend && npm install

# Build frontend
frontend-build: frontend-install
	cd frontend && npm run build

# Run Go server only (assumes frontend is already built)
run:
	go run cmd/server/main.go

# Development: build frontend then run Go server (single terminal)
dev-build: frontend-build run

# Development: run both frontend dev server and backend (requires 2 terminals)
# Terminal 1: make dev-backend
# Terminal 2: make dev-frontend
dev-backend:
	go run cmd/server/main.go

dev-frontend:
	cd frontend && npm run dev

# Build production binary
build: frontend-build
	CGO_ENABLED=1 go build -o bin/server cmd/server/main.go

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf frontend/dist/
	rm -rf frontend/node_modules/

# Help
help:
	@echo "Available commands:"
	@echo "  make dev-build      - Build frontend and run Go server (single terminal)"
	@echo "  make dev-backend    - Run Go server only (for use with dev-frontend)"
	@echo "  make dev-frontend   - Run Vite dev server with HMR"
	@echo "  make build          - Build production binary"
	@echo "  make run            - Run Go server (assumes frontend built)"
	@echo "  make frontend-build - Build frontend only"
	@echo "  make clean          - Remove build artifacts"
