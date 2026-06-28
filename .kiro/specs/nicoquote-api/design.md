# Design Document

## Overview

This document describes the design for the nicoquote backend API, a Vietnamese quote service. The system follows a clean architecture pattern with clear separation of concerns.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    API Gateway/Router                       │
│              (Rate Limiting, CORS, Security)                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Controllers Layer                         │
│              (RESTful Endpoints, Validation)                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Services Layer                           │
│              (Business Logic, Rate Limiting)                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Repository Layer                           │
│              (Database Access, ORM)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  PostgreSQL Database                        │
│              (Quotes Table, Indexes)                        │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Rate Limiting | express-rate-limit |
| Documentation | Swagger UI (swagger-jsdoc) |
| Testing | Jest, Supertest |
| Logging | Winston |
| Configuration | dotenv |

## Database Design

### Schema Definition (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Quote {
  id        String   @id @default(uuid()) @map("id")
  content   String   @map("content")
  author    String   @map("author")
  tags      String[] @default([]) @map("tags")
  createdAt DateTime @defaultNow() @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([author])
  @@index([tags])
  @@table("quotes")
}
```

### Indexes

- `idx_quotes_author` - Index on author column for efficient author-based queries
- `idx_quotes_tags` - GIN index on tags array for efficient tag filtering

## API Endpoints

### 1. GET /api/quotes
Retrieve all quotes with optional filtering.

**Query Parameters:**
- `limit` (optional): Number of results (default: 50, max: 100)
- `author` (optional): Filter by author (case-insensitive)
- `tag` (optional): Filter by tag

**Response:**
```json
[
  {
    "id": "uuid",
    "content": "Quote content",
    "author": "Author Name",
    "tags": ["inspirational", "motivational"],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### 2. GET /api/quotes/:id
Retrieve a single quote by ID.

**Response:**
```json
{
  "id": "uuid",
  "content": "Quote content",
  "author": "Author Name",
  "tags": ["inspirational"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 3. POST /api/quotes
Create a new quote (requires API key).

**Headers:**
- `X-API-Key`: Valid API key

**Request Body:**
```json
{
  "content": "Quote content",
  "author": "Author Name",
  "tags": ["inspirational"]
}
```

### 4. GET /api/docs
Swagger documentation UI.

## Security Design

### Authentication
- API Key based authentication for write operations
- Key passed via `X-API-Key` header
- Keys stored in environment variables

### Rate Limiting
- **Window**: 60 seconds (configurable via `RATE_LIMIT_WINDOW_MS`)
- **Max Requests**: 100 per window per IP (configurable via `RATE_LIMIT_REQUESTS`)
- **Headers**: `Retry-After` on 429 response

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'`

## Environment Configuration

```env
# Required
DATABASE_URL="postgresql://user:pass@host:port/db"
PORT=3000
NODE_ENV=development

# Optional
API_KEY="secret-api-key"
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_LEVEL="info"
```

## Testing Strategy

### Unit Tests
- Controllers: Input validation, response formatting
- Services: Business logic, filtering logic
- Utilities: Helper functions

### Integration Tests
- API endpoints with test database
- Rate limiting behavior
- Authentication enforcement

### Property-Based Tests
- Quote filtering invariants
- ID format validation
- Input validation boundaries

## Seed Data

Temporary example quotes in Vietnamese:

```json
[
  {"content": "Đời ngắn, hãy yêu người thương.", "author": "Nhà thơ", "tags": ["tình yêu"]},
  {"content": "Hành động là sức mạnh.", "author": "Chốt gần nhau", "tags": ["động lực"]},
  {"content": "Học không bằng mắt. Phải đi đến nơi khác mới biết được gì.", "author": "Trải giác", "tags": ["triết học"]}
]
```

## Deployment Considerations

- Free tier PostgreSQL (Neon, Supabase, or Render)
- Environment-based configuration
- Health check endpoint at `/healthz`
- Graceful shutdown handling