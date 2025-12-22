# Stage 1: Build React frontend
FROM node:20-alpine AS frontend

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build for production
RUN npm run build

# Stage 2: Build Go backend
FROM golang:1.21-alpine AS backend

# Install build dependencies for CGO (required by sqlite3)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Copy built frontend from previous stage
COPY --from=frontend /app/frontend/dist ./frontend/dist

# Build the Go binary with CGO enabled for sqlite
ENV CGO_ENABLED=1
RUN go build -ldflags="-s -w" -o server cmd/server/main.go

# Stage 3: Production image
FROM alpine:latest

# Install runtime dependencies for sqlite
RUN apk add --no-cache ca-certificates libc6-compat

WORKDIR /app

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Copy built binary
COPY --from=backend /app/server .

# Copy frontend dist
COPY --from=backend /app/frontend/dist ./frontend/dist

# Set environment variables
ENV PORT=8080
ENV DB_PATH=/app/data/wallet.db

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the server
CMD ["./server"]
