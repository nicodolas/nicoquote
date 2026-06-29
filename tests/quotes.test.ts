import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { QuoteService } from '../src/services/quoteService';

type Quote = {
    id: string;
    content: string;
    author: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
};

const apiKey = process.env['API_KEY'] ?? 'secret_api_key_123';

class TestRateLimitStore {
    private records = new Map<string, { current: number; ttl: number; iterationStartMs: number }>();

    incr(
        key: string,
        callback: (error: Error | null, result?: { current: number; ttl: number }) => void,
        timeWindow = 60000,
        max = 1000,
    ) {
        const now = Date.now();
        const record = this.records.get(key);

        if (!record || record.iterationStartMs + timeWindow <= now) {
            const next = { current: 1, ttl: timeWindow, iterationStartMs: now };
            this.records.set(key, next);
            callback(null, next);
            return;
        }

        record.current += 1;
        record.ttl = Math.max(timeWindow - (now - record.iterationStartMs), 0);
        this.records.set(key, record);
        callback(null, record);
    }

    child() {
        const child = new TestRateLimitStore();
        child.records = this.records;
        return child;
    }
}

function createQuote(overrides: Partial<Quote> = {}): Quote {
    return {
        id: overrides.id ?? `id-${Math.random().toString(36).slice(2)}`,
        content: overrides.content ?? 'Test quote content',
        author: overrides.author ?? 'Test Author',
        tags: overrides.tags ?? ['test'],
        createdAt: overrides.createdAt ?? new Date().toISOString(),
        updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    };
}

function createMockService(seed: Quote[] = []): QuoteService {
    const quotes = [...seed];

    return {
        async getAll(filters = {}) {
            let result = [...quotes];
            if (filters.author) {
                result = result.filter((quote) =>
                    quote.author.toLowerCase().includes(filters.author!.toLowerCase()),
                );
            }
            if (filters.tag) {
                result = result.filter((quote) => quote.tags.includes(filters.tag!));
            }
            return result.slice(0, filters.limit ?? 50);
        },
        async getById(id: string) {
            return quotes.find((quote) => quote.id === id) ?? null;
        },
        async getRandom() {
            return quotes[0] ?? null;
        },
        async create(data: { content: string; author: string; tags?: string[] }) {
            const quote = createQuote({
                id: `id-${quotes.length + 1}`,
                content: data.content,
                author: data.author,
                tags: data.tags ?? [],
            });
            quotes.push(quote);
            return quote;
        },
        async update(id: string, data: { content?: string; author?: string; tags?: string[] }) {
            const quote = quotes.find((item) => item.id === id);
            if (!quote) return null;
            Object.assign(quote, data, { updatedAt: new Date().toISOString() });
            return quote;
        },
        async delete(id: string) {
            const index = quotes.findIndex((quote) => quote.id === id);
            if (index === -1) return null;
            return quotes.splice(index, 1)[0];
        },
    } as QuoteService;
}

describe('Quote API', () => {
    let app: FastifyInstance;

    afterEach(async () => {
        await app.close();
    });

    describe('GET /api/quotes', () => {
        beforeEach(async () => {
            app = buildApp({
                quoteService: createMockService([
                    createQuote({ id: '1', author: 'Someone', tags: ['happy'] }),
                    createQuote({ id: '2', author: 'Another', tags: ['sad'] }),
                ]),
                rateLimitStore: TestRateLimitStore,
            });
            await app.ready();
        });

        it('returns JSON list of quotes', async () => {
            const res = await app.inject({ method: 'GET', url: '/api/quotes' });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toHaveLength(2);
        });

        it('filters by limit', async () => {
            const res = await app.inject({ method: 'GET', url: '/api/quotes?limit=1' });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toHaveLength(1);
        });

        it('returns 400 for invalid limit', async () => {
            const res = await app.inject({ method: 'GET', url: '/api/quotes?limit=abc' });
            expect(res.statusCode).toBe(400);
            expect(res.json().message).toBe('limit must be an integer between 1 and 100');
        });

        it('returns 400 for unexpected query parameters', async () => {
            const res = await app.inject({ method: 'GET', url: '/api/quotes?foo=bar' });
            expect(res.statusCode).toBe(400);
        });

        it('filters by author case-insensitive', async () => {
            const res = await app.inject({ method: 'GET', url: '/api/quotes?author=some' });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toHaveLength(1);
        });

        it('filters by tag', async () => {
            const res = await app.inject({ method: 'GET', url: '/api/quotes?tag=happy' });
            expect(res.statusCode).toBe(200);
            expect(res.json()).toHaveLength(1);
        });
    });

    describe('POST /api/quotes', () => {
        beforeEach(async () => {
            app = buildApp({
                quoteService: createMockService(),
                rateLimitStore: TestRateLimitStore,
            });
            await app.ready();
        });

        const validBody = {
            content: 'Hoc, hoc nua, hoc mai.',
            author: 'Lenin',
            tags: ['hoc tap', 'kien tri'],
        };

        it('creates a quote and returns 201 with id, content, author, tags', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/quotes',
                headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
                payload: validBody,
            });

            expect(res.statusCode).toBe(201);
            expect(res.json()).toMatchObject(validBody);
        });

        it('returns 400 when body is empty and API key is valid', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/quotes',
                headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
                payload: {},
            });

            expect(res.statusCode).toBe(400);
        });

        it('returns 401 when X-API-Key header is absent', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/quotes',
                headers: { 'content-type': 'application/json' },
                payload: validBody,
            });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/quotes/:id', () => {
        beforeEach(async () => {
            app = buildApp({
                quoteService: createMockService([createQuote({ id: 'test-id-123' })]),
                rateLimitStore: TestRateLimitStore,
            });
            await app.ready();
        });

        it('returns 200 and a single quote object for an existing ID', async () => {
            const res = await app.inject({ method: 'GET', url: '/api/quotes/test-id-123' });

            expect(res.statusCode).toBe(200);
            expect(res.json()).toMatchObject({ id: 'test-id-123' });
        });

        it('returns 404 for a non-existing ID', async () => {
            const res = await app.inject({ method: 'GET', url: '/api/quotes/missing' });
            expect(res.statusCode).toBe(404);
        });
    });
});
