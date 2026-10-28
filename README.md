# Transaction Ledger API

A RESTful API built with **Node.js, Express.js, and PostgreSQL** to manage accounts, record credit and debit transactions, retrieve account balances, and view paginated transaction history.

## Features

- Create accounts with an automatically generated UUID and an initial balance of zero.
- Record credit and debit transactions.
- Prevent debits that exceed the available balance.
- Prevent duplicate transaction reference IDs within an account.
- Retrieve account balances.
- Retrieve transaction history with optional type filtering and pagination.
- Validate request bodies, account IDs, transaction types, and amounts.
- Use PostgreSQL transactions to keep transaction records and account balances consistent.
- Return consistent JSON error responses.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- `pg` — PostgreSQL client
- `dotenv` — environment variable management
- `zod` — request validation
- `nodemon` — development server

## Prerequisites

Install the following before running the project:

- Node.js and npm
- PostgreSQL
- Git (optional)

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd transaction-ledger-api
```

Alternatively, open your existing project directory in VS Code.

### 2. Install dependencies

```bash
npm install
```

### 3. Create the database

Create a PostgreSQL database named `transaction_ledger`:

```sql
CREATE DATABASE transaction_ledger;
```

Connect to the database and execute the following schema:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL
        CHECK (LENGTH(TRIM(name)) > 0),
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0
        CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL
        REFERENCES accounts(id),
    type VARCHAR(10) NOT NULL
        CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(18, 2) NOT NULL
        CHECK (amount > 0),
    description TEXT NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_account_reference
        UNIQUE (account_id, reference_id)
);

CREATE INDEX idx_transactions_account_created
    ON transactions (account_id, created_at DESC, id DESC);
```

The database generates account IDs, transaction IDs, and creation timestamps. The unique constraint prevents a reference ID from being reused within the same account.

### 4. Configure environment variables

Create a `.env` file in the project root:

```dotenv
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/transaction_ledger
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

**Do not commit `.env` to version control.** Add it to `.gitignore`.

### 5. Start the application

For development:

```bash
npm run dev
```

For normal execution, if the `start` script is configured:

```bash
npm start
```

The server should start at:

`http://localhost:3000`

Verify that the server is running by opening the root endpoint:

```http
GET /
```

Expected response:

```json
{
  "message": "Transaction Ledger API is running"
}
```

## API Reference

Base URL: `http://localhost:3000`

All request and response bodies use JSON unless otherwise specified.

### 1. Create an account

Creates an account with a zero balance.

**Endpoint:** `POST /api/accounts`

Request body:

```json
{
  "name": "John Doe"
}
```

Success response — `201 Created`:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "balance": "0.00",
    "created_at": "2026-10-28T10:00:00.000Z"
  }
}
```

Validation rules:

- `name` is required and must not be blank.
- The account name must not exceed 150 characters.
- Additional fields, including `balance`, are rejected.

### 2. Get account balance

Returns the current balance for an account.

**Endpoint:** `GET /api/accounts/:id/balance`

Example:

```http
GET /api/accounts/550e8400-e29b-41d4-a716-446655440000/balance
```

Success response — `200 OK`:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "balance": "1000.00"
  }
}
```

Errors:

- `400 Bad Request` — invalid account ID format.
- `404 Not Found` — account does not exist.

### 3. Create a transaction

Creates a credit or debit transaction and updates the account balance atomically.

**Endpoint:** `POST /api/accounts/:id/transactions`

Example credit request:

```json
{
  "type": "credit",
  "amount": 1000,
  "description": "Initial deposit",
  "reference_id": "PAYMENT-001"
}
```

Success response — `201 Created`:

```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "account_id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "credit",
      "amount": "1000.00",
      "description": "Initial deposit",
      "reference_id": "PAYMENT-001",
      "created_at": "2026-10-28T10:05:00.000Z"
    },
    "balance": "1000.00"
  }
}
```

Example debit request:

```json
{
  "type": "debit",
  "amount": 200,
  "description": "Purchase",
  "reference_id": "PAYMENT-002"
}
```

The debit succeeds only if the account has sufficient funds.

Validation rules:

- `type` must be `credit` or `debit`.
- `amount` must be a positive number with at most two decimal places.
- `description` is required and must not exceed 1,000 characters.
- `reference_id` is required and must not exceed 255 characters.
- Additional fields are rejected.

Errors:

- `400 Bad Request` — invalid request body or account ID format.
- `404 Not Found` — account does not exist.
- `409 Conflict` — duplicate reference ID or insufficient funds.

Failed transactions must not change the account balance or create a transaction record.

### 4. Get transaction history

Returns an account's transactions in newest-first order, with optional filtering and pagination.

**Endpoint:** `GET /api/accounts/:id/transactions`

Query parameters:

| Parameter | Required | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| `type`    | No       | Filter by `credit` or `debit`                     |
| `page`    | No       | Page number; defaults to `1`                      |
| `limit`   | No       | Records per page; defaults to `10`, maximum `100` |

Examples:

```http
GET /api/accounts/:id/transactions
GET /api/accounts/:id/transactions?type=credit
GET /api/accounts/:id/transactions?type=debit
GET /api/accounts/:id/transactions?page=2&limit=10
GET /api/accounts/:id/transactions?type=credit&page=1&limit=5
```

Success response — `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "account_id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "credit",
      "amount": "1000.00",
      "description": "Initial deposit",
      "reference_id": "PAYMENT-001",
      "created_at": "2026-10-28T10:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

The API orders results by `created_at DESC, id DESC`. The ID provides a deterministic tie-breaker when multiple transactions have the same timestamp.

Errors:

- `400 Bad Request` — invalid account ID, transaction type, page, or limit.
- `404 Not Found` — account does not exist.

## Error Response Format

Errors use a consistent JSON structure.

Example — `400 Bad Request`:

```json
{
  "success": false,
  "message": "Validation failed"
}
```

Example — `409 Conflict`:

```json
{
  "success": false,
  "message": "Insufficient funds"
}
```

Example — `404 Not Found`:

```json
{
  "success": false,
  "message": "Account not found"
}
```

## HTTP Status Codes

| Status                      | Meaning                                      |
| --------------------------- | -------------------------------------------- |
| `200 OK`                    | Request completed successfully               |
| `201 Created`               | Account or transaction created               |
| `400 Bad Request`           | Invalid request data or parameter            |
| `404 Not Found`             | Requested account does not exist             |
| `409 Conflict`              | Duplicate reference ID or insufficient funds |
| `500 Internal Server Error` | Unexpected server-side failure               |

## Data Integrity and Design Decisions

### Atomic transactions

Transaction creation uses a PostgreSQL database transaction:

1. Begin a database transaction.
2. Lock the account row using `SELECT ... FOR UPDATE`.
3. Verify the account exists and the reference ID is not duplicated.
4. Update the balance, checking sufficient funds for debits.
5. Insert the transaction record.
6. Commit the transaction.

If an operation fails, the database transaction is rolled back. This prevents a balance update from succeeding without its corresponding transaction record.

### Duplicate prevention

The combination of `account_id` and `reference_id` must be unique. The same reference ID can be used on different accounts, but not twice on the same account.

### Immutable transaction history

The API does not provide endpoints to update or delete existing transactions. Corrections should be represented by new transactions rather than modifying historical records.

### Balance consistency

Every successful credit or debit updates the account balance and creates a corresponding transaction record within the same database transaction.

### Monetary precision

Amounts use PostgreSQL `NUMERIC(18, 2)` rather than floating-point database types to preserve decimal precision. PostgreSQL's Node.js driver typically returns `NUMERIC` values as strings in JSON responses.

## Project Structure

```text
transaction-ledger-api/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── account.controller.js
│   │   └── transaction.controller.js
│   ├── middleware/
│   │   └── error.middleware.js
│   ├── routes/
│   │   └── account.routes.js
│   ├── services/
│   │   ├── account.service.js
│   │   └── transaction.service.js
│   ├── validators/
│   │   ├── account.validator.js
│   │   └── transaction.validator.js
│   ├── app.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Assumptions and Limitations

- Each account has a single balance; multi-currency support is not included.
- Amounts are represented to two decimal places.
- Transaction reference IDs are unique per account, not globally.
- Account and transaction IDs are generated by the database.
- Account creation does not allow the client to set a balance.
- Transaction correction and deletion are not supported by the API.
- Authentication, authorization, and account ownership checks are outside the current assignment scope.
- The API assumes that balance updates are performed through the transactional service. Direct database modifications could bypass the application-level consistency rules.
