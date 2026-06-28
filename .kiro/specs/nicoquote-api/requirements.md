# Requirements Document

## Introduction

This document outlines the requirements for a backend web API for a Vietnamese app called nicoquote that provides quotes. The API will serve quote data, support rate limiting, security, testing, documentation, and use PostgreSQL as the database.

## Glossary

- **System**: The nicoquote backend API
- **Quote**: A text snippet attributed to a person, containing content and author fields
- **User**: An external client consuming the API (could be unauthenticated or authenticated)
- **API Key**: A token used for authenticating requests to the API
- **Rate Limit**: Maximum number of requests allowed per client within a time window
- **PostgreSQL**: The relational database used to store quote data
- **Swagger/OpenAPI**: Specification format for API documentation

## Requirements

### Requirement 1: Retrieve Quotes

**User Story:** As a user, I want to retrieve quotes from the API so that I can display them in the application.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/quotes`, THE System SHALL return a list of quotes in JSON format
2. WHERE no quotes exist, THE System SHALL return an empty array
3. WHEN query parameter `limit` is provided, THE System SHALL return at most that many quotes
4. WHEN query parameter `author` is provided, THE System SHALL return quotes matching that author (case-insensitive)
5. WHEN query parameter `tag` is provided, THE System SHALL return quotes matching that tag
6. WHERE temporary example data is needed, THE System SHALL provide seed data on startup

### Requirement 2: Get Quote by ID

**User Story:** As a user, I want to retrieve a specific quote by its ID so that I can show a single quote.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/quotes/{id}`, THE System SHALL return the quote with the given ID
2. IF the quote with the given ID does not exist, THEN THE System SHALL return a 404 Not Found error
3. THE response SHALL be a single quote object in JSON format

### Requirement 3: Create Quote (Authenticated)

**User Story:** As an authenticated user, I want to create a new quote so that I can contribute content.

#### Acceptance Criteria

1. WHERE the user provides a valid API key, THE System SHALL allow creating a quote via POST to `/api/quotes`
2. WHEN a POST request is made with valid quote data (content and author), THE System SHALL create the quote and return it with a 201 Created status
3. IF required fields are missing, THEN THE System SHALL return a 400 Bad Request error with validation details
4. THE System SHALL assign a unique ID to each new quote

### Requirement 4: Rate Limiting

**User Story:** As a system administrator, I want to limit API usage to prevent abuse.

#### Acceptance Criteria

1. WHILE rate limiting is enabled, THE System SHALL restrict requests based on IP address or API key
2. WHEN a client exceeds the allowed requests per minute, THEN THE System SHALL return a 429 Too Many Requests response
3. THE System SHALL include retry-after header indicating when the client can try again
4. WHERE configuration is provided, THE System SHALL allow customizing rate limit values

### Requirement 5: Authentication and Authorization

**User Story:** As a developer, I want to secure the API so that only authorized clients can modify data.

#### Acceptance Criteria

1. WHERE an API key is required for write operations, THE System SHALL validate the key on POST, PUT, DELETE endpoints
2. WHEN an invalid or missing API key is provided, THEN THE System SHALL return a 401 Unauthorized response
3. THE System SHALL support environment-based configuration for API keys
4. WHERE no API key is provided for read-only endpoints, THE System SHALL allow access (optional authentication)

### Requirement 6: API Documentation

**User Story:** As a developer, I want clear API documentation so that I can integrate with the API easily.

#### Acceptance Criteria

1. THE System SHALL provide Swagger/OpenAPI documentation at `/api/docs`
2. THE documentation SHALL include all endpoints, request/response examples, and authentication requirements
3. THE documentation SHALL be automatically generated from code annotations
4. WHERE the API changes, THE System SHALL be updated accordingly

### Requirement 7: Database Storage

**User Story:** As a system, I want to store quote data persistently so that it survives restarts.

#### Acceptance Criteria

1. THE System SHALL use PostgreSQL as the primary database
2. THE database schema SHALL include a quotes table with columns: id (primary key), content, author, tags (optional array), created_at, updated_at
3. THE System SHALL run migrations on startup to ensure schema is up to date
4. WHERE connection details are provided via environment variables, THE System SHALL connect to PostgreSQL

### Requirement 8: Environment Configuration

**User Story:** As a developer, I want to configure the API via environment variables so that I can deploy across different environments.

#### Acceptance Criteria

1. THE System SHALL read configuration from a `.env` file
2. REQUIRED environment variables SHALL include: DATABASE_URL, PORT, API_KEY (optional), RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS
3. WHERE environment variables are missing, THE System SHALL use sensible defaults for development
4. THE System SHALL log a warning if critical env vars are missing in production

### Requirement 9: Testing

**User Story:** As a developer, I want a test suite so that I can ensure the API works correctly and prevent regressions.

#### Acceptance Criteria

1. THE System SHALL include unit tests for controllers, services, and utilities
2. THE System SHALL include integration tests for API endpoints using a test database
3. THE System SHALL follow Test-Driven Development (TDD) approach
4. THE System SHALL achieve at least 80% code coverage
5. WHERE possible, THE System SHALL use property-based testing for logic functions

### Requirement 10: Performance and Optimization

**User Story:** As a user, I want fast responses so that the app feels responsive.

#### Acceptance Criteria

1. WHEN querying quotes, THE System SHALL return results within 200ms for typical dataset sizes
2. THE System SHALL use database indexes on frequently queried fields (author, tags)
3. WHERE caching is beneficial, THE System SHALL implement in-memory caching for frequent queries
4. THE System SHALL minimize external dependencies to reduce latency