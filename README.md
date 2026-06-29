# NicoQuote API

A production-ready Vietnamese Quote REST API built with Fastify, Prisma ORM, and Neon PostgreSQL.

## Features

- **RESTful API** for managing Vietnamese quotes
- **Authentication**: API key required for write operations (POST, PUT, PATCH, DELETE)
- **Public Access**: GET endpoints accessible without authentication
- **Rate Limiting**: IP-based rate limiting with configurable limits
- **Documentation**: Swagger/OpenAPI UI at `/api/docs`
- **Type Safety**: Full TypeScript support with strict typing
- **Database**: Neon PostgreSQL (serverless) with Prisma ORM
- **Security**: Helmet.js for security headers
- **Validation**: Zod schema validation with detailed error messages

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **Database**: Neon PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Documentation**: @fastify/swagger + @fastify/swagger-ui
- **Rate Limiting**: @fastify/rate-limit
- **Security**: @fastify/helmet
- **Testing**: Vitest

## Project Structure

```
src/
├── app.ts                 # Application entry point
├── index.ts               # Server startup
├── config/
│   └── env.ts             # Environment configuration
├── controllers/
│   └── quoteController.ts # Request handlers
├── middlewares/
│   ├── auth.ts            # API key authentication
│   └── validation.ts      # Zod schema validation
├── modules/
│   └── quote/
│       └── schema.ts      # Zod schemas for quotes
├── routes/
│   └── quote.ts           # Quote routes with JSON schemas
├── services/
│   └── quoteService.ts    # Business logic with Prisma
└── utils/
    ├── apiKey.ts          # API key utilities
    ├── errorHandler.ts    # Error handling
    └── logger.ts          # Logging utilities
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/quotes` | ❌ | List quotes with optional filtering |
| GET | `/api/quotes/random` | ❌ | Get a random quote (JSON) |
| GET | `/api/quotes/random/image` | ❌ | Get a random quote as SVG image |
| GET | `/api/quotes/:id` | ❌ | Get quote by ID |
| POST | `/api/quotes` | ✅ | Create a new quote |
| PUT | `/api/quotes/:id` | ✅ | Update a quote (full) |
| PATCH | `/api/quotes/:id` | ✅ | Update a quote (partial) |
| DELETE | `/api/quotes/:id` | ✅ | Delete a quote |
| GET | `/healthz` | ❌ | Health check endpoint |

### Query Parameters (GET /api/quotes)

- `author` - Filter by author (case-insensitive)
- `tag` - Filter by tag
- `limit` - Maximum number of results (default: 50)

### Quote Image Endpoint — `/api/quotes/random/image`

Returns a random quote rendered as an SVG image, with full Vietnamese Unicode support via Google Fonts. Perfect for GitHub READMEs.

**Basic embed:**
```markdown
![Random Quote](https://your-domain.com/api/quotes/random/image)
```

**With custom styling:**
```markdown
![Random Quote](https://your-domain.com/api/quotes/random/image?theme=ocean&font=bevietnampro&width=700&fontSize=22)
```

#### Color Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | enum | `dark` | Preset theme — `dark` `light` `ocean` `rose` `forest` `sunset` `mono` |
| `bg` | string | (theme) | Background color — hex without `#` or CSS name, e.g. `0d1117` |
| `color` | string | (theme) | Quote text color — hex without `#` or CSS name |
| `authorColor` | string | (accent) | Author name color — hex without `#` or CSS name |
| `accent` | string | (theme) | Accent / left-border color — hex without `#` or CSS name |
| `quoteMarkOpacity` | number 0–1 | `0.5` | Opacity of the decorative `"` quote mark |

#### Typography Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `font` | enum | `bevietnampro` | Google Font preset (see table below) |
| `fontSize` | integer 12–60 | `20` | Quote content font size in pixels |
| `authorSize` | integer 10–48 | `fontSize × 0.82` | Author name font size in pixels |
| `italic` | boolean | `true` | Render quote in italic |
| `boldAuthor` | boolean | `true` | Render author name in bold |
| `letterSpacing` | number -0.05–0.2 | `0.01` | Letter spacing in `em` units |

#### Layout Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | integer 300–1200 | `800` | Image width in pixels |
| `radius` | integer 0–40 | `12` | Card border radius in pixels |
| `padding` | integer 16–80 | `40` | Inner padding in pixels |
| `borderWidth` | integer 0–12 | `4` | Left accent bar width. Set `0` to hide |
| `showQuoteIcon` | boolean | `true` | Show decorative `"` opening quote mark |

#### Available Themes

| Theme | Background | Text | Accent |
|-------|-----------|------|--------|
| `dark` *(default)* | `#0d1117` | `#e6edf3` | Indigo |
| `light` | `#ffffff` | `#1f2937` | Indigo |
| `ocean` | `#0f172a` | `#bae6fd` | Sky blue |
| `rose` | `#1c1917` | `#fce7f3` | Pink |
| `forest` | `#052e16` | `#d1fae5` | Emerald |
| `sunset` | `#1c0a00` | `#fef3c7` | Orange |
| `mono` | `#18181b` | `#d4d4d8` | Zinc |

#### Available Fonts (Google Fonts — full Vietnamese support)

| Value | Font |
|-------|------|
| `bevietnampro` *(default)* | Be Vietnam Pro — optimized for Vietnamese |
| `notosans` | Noto Sans — maximum Unicode coverage |
| `lato` | Lato — clean modern sans |
| `merriweather` | Merriweather — readable serif |
| `playfair` | Playfair Display — elegant display serif |
| `roboto` | Roboto — Google's system font |
| `inter` | Inter — UI-focused sans |

> **Tip:** Individual color params (`bg`, `color`, `accent`, `authorColor`) always override the selected theme.

#### Examples

```
# Default dark theme
GET /api/quotes/random/image

# Light theme, larger text, no italic
GET /api/quotes/random/image?theme=light&fontSize=24&italic=false

# Ocean theme, wider card, Playfair font
GET /api/quotes/random/image?theme=ocean&font=playfair&width=900

# Sunset theme, custom author color
GET /api/quotes/random/image?theme=sunset&authorColor=fbbf24

# Fully custom colors, no left border
GET /api/quotes/random/image?bg=1e1b4b&color=e0e7ff&accent=818cf8&borderWidth=0

# Minimal card, no quote icon
GET /api/quotes/random/image?theme=mono&showQuoteIcon=false&radius=4
```

### Request Body (POST /api/quotes)

```json
{
  "content": "Quote content (required, 1-1000 chars)",
  "author": "Author name (required)",
  "tags": ["tag1", "tag2"] // optional
}
```

### Authentication

For write operations, include the API key in the header:
```
X-API-Key: your-api-key
```

### Response Format

**Success (200/201):**
```json
{
  "id": "uuid",
  "content": "Quote content",
  "author": "Author name",
  "tags": ["tag1"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error (400/401/404/429):**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Quote not found"
}
```

## Getting Started

### Prerequisites

- Node.js 20+
- Neon PostgreSQL database (or any PostgreSQL)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nicoquote

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and API_KEY

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database with sample quotes (optional)
npx prisma db seed
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 3000) | No |
| `API_KEY` | API key for write operations | Yes |
| `RATE_LIMIT_REQUESTS` | Max requests per window (default: 100) | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms (default: 60000) | No |
| `NODE_ENV` | Environment (development/production/test) | No |

### Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run tests with coverage
npm run test

# Run tests in watch mode
npm run test:watch
```

## Documentation

Swagger UI is available at `/api/docs` when the server is running.

Example: `http://localhost:3000/api/docs`

## Database Schema

```prisma
model Quote {
  id        String   @id @default(uuid())
  content   String
  author    String
  tags      String[] @default([])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([author])
  @@index([tags])
}
```

## Deployment

### Environment Setup

1. Create a Neon PostgreSQL database
2. Set `DATABASE_URL` in environment variables
3. Generate a secure `API_KEY`
4. Run migrations: `npx prisma migrate deploy`

### Docker (optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## License

MIT