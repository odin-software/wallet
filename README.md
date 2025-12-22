# Odin Wallet

A professional, mobile-first personal finance management application built with Go and React.

![Odin Wallet](https://img.shields.io/badge/Odin-Wallet-DDE61F?style=for-the-badge&logo=wallet&logoColor=0F1822)

## Features

- **Multi-user Support**: Secure registration and authentication with session-based cookies
- **Multiple Account Types**: Cash, Debit Card, Credit Card, Loan, Savings, Investment
- **Transaction Tracking**: Categorized transactions with detailed history
- **Financial Overview**: Assets vs Liabilities dashboard with net worth calculation
- **Multi-currency Support**: Track accounts in different currencies
- **Mobile-first Design**: Responsive UI optimized for mobile and desktop

## Tech Stack

- **Backend**: Go with Chi router and SQLite
- **Frontend**: React 18 + Vite + TailwindCSS + Framer Motion
- **Deployment**: Docker with GitHub Actions CI/CD

## Development Setup

### Prerequisites

- Go 1.21+
- Node.js 20+
- npm or pnpm

### Quick Start

```bash
# Clone the repository
git clone https://github.com/kengru/odin-wallet.git
cd odin-wallet

# Start the backend (from root directory)
go mod download
go run cmd/server/main.go

# In a separate terminal, start the frontend
cd frontend
npm install
npm run dev
```

- Backend runs on `http://localhost:8080`
- Frontend dev server runs on `http://localhost:5173` (proxies API requests to backend)

## Production Deployment (Docker)

### Pull from GitHub Container Registry

```bash
# Pull the latest image
docker pull ghcr.io/kengru/odin-wallet:latest

# Run with persistent data volume
docker run -d \
  --name odin-wallet \
  -p 8080:8080 \
  -v $(pwd)/wallet-data:/app/data \
  -e SESSION_SECRET=your-secure-secret-here \
  ghcr.io/kengru/odin-wallet:latest
```

Access the application at `http://localhost:8080`

### Build from Source

```bash
# Build the Docker image
docker build -t odin-wallet .

# Run the container
docker run -d \
  --name odin-wallet \
  -p 8080:8080 \
  -v $(pwd)/wallet-data:/app/data \
  -e SESSION_SECRET=your-secure-secret-here \
  odin-wallet
```

## Environment Variables

| Variable         | Description                                             | Default                           |
| ---------------- | ------------------------------------------------------- | --------------------------------- |
| `PORT`           | Server port                                             | `8080`                            |
| `SESSION_SECRET` | Secret key for session cookies (required in production) | `dev-secret-change-in-production` |
| `DB_PATH`        | Path to SQLite database file                            | `./data/wallet.db`                |

## Account Types

| Type            | Description                      | Balance Field                              |
| --------------- | -------------------------------- | ------------------------------------------ |
| **Cash**        | Physical cash tracking           | `current_balance`                          |
| **Debit Card**  | Bank debit/checking accounts     | `current_balance`                          |
| **Credit Card** | Credit cards with limit tracking | `credit_owed`                              |
| **Loan**        | Loans with payment tracking      | `loan_current_owed`                        |
| **Savings**     | Savings accounts with interest   | `current_balance` + `yearly_interest_rate` |
| **Investment**  | Investment accounts              | `current_balance` + `yearly_interest_rate` |

## Transaction Categories

Groceries, Dining, Transport, Utilities, Rent, Healthcare, Entertainment, Shopping, Subscriptions, Games, Travel, Education, Fitness, Personal, Gifts, Income, Transfer, Other

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Accounts

- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `GET /api/accounts/:id` - Get account details
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/overview` - Get financial overview

### Transactions

- `POST /api/accounts/:id/transactions` - Create transaction
- `GET /api/accounts/:id/transactions` - List account transactions
- `GET /api/transactions/recent` - Get recent transactions across all accounts

## Project Structure

```
wallet/
├── cmd/server/           # Go server entry point
├── internal/
│   ├── handlers/         # HTTP request handlers
│   ├── middleware/       # Auth middleware
│   ├── models/           # Data models
│   └── services/         # Business logic
├── pkg/database/         # SQLite initialization
├── frontend/
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   └── types/        # TypeScript types
│   └── ...
├── Dockerfile
├── .github/workflows/    # CI/CD
└── README.md
```

## License

Private - Odin Company

---

Built with 💛 by Odin
