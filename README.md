# Customer Order Portal

Node.js + Express REST API for DevOps CI/CD practice.

## Requirements
- Node.js 22
- PostgreSQL
- Application port: 3000
- Start command: `npm start`

## Endpoints
- `GET /` - application summary and orders
- `GET /orders` - list orders
- `GET /orders/:id` - retrieve one order
- `GET /health` - health check
- `GET /ready` - readiness check

## Database environment variables
- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASSWORD

Database schema and sample data are under `db/`.
