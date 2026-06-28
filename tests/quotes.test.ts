import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';

// In-memory store shared between mock and tests
const quoteStore: any[] = [];

// Mock the Quote model so tests don't need a real MongoDB connection
vi.mock('../src/modules/quote/models/Quote', () => {
    const Quote = {
        find: vi.fn(async () => quoteStore),
        findById: vi.fn(async (id: string) =>
            quoteStore.find((q) => q._id?.toString() === id || q.id === id) ?? null
        ),
        countDocuments: vi.fn(async () => quoteStore.length),
        findOne: vi.fn(async () => quoteStore[0] ?? null),
        create: vi.fn(async (data: any) => {
            const doc = Array.isArray(data) ? data[0] : data;
            const quote = {
                _id: `id-${quoteStore.length + 1}`,
                id: `id-${quoteStore.length + 1}`,
                content: doc.content,
                author: doc.author,
                tags: doc.tags ?? [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                toJSON() { return { ...this }; },
            };
            quoteStore.push(quote);
            return [quote];
        }),
        findByIdAndUpdate: vi.fn(async (id: string, update: any) => {
            const idx = quoteStore.findIndex((q) => q._id?.toString() === id || q.id === id);
            if (idx === -1) return null;
            Object.assign(quoteStore[idx], update);
            return quoteStore[idx];
        }),
        findByIdAndDelete: vi.fn(async (id: string) => {
            const idx = quoteStore.findIndex((q) => q._id?.toString() === id || q.id === id);
            if (idx === -1) return null;
            return quoteStore.splice(idx, 1)[0];
        }),
    };

    return { Quote };
});

let app: FastifyInstance;

beforeAll(async () => {
    app = buildApp();
    await app.ready();
});

afterAll(async () => {
    await app.close();
});

describe('GET /api/quotes', () => {
    it('returns JSON list of quotes', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/quotes' });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body)).toBe(true);
        if (body.length) {
            const q = body[0];
            expect(q).toHaveProperty('id');
            expect(q).toHaveProperty('content');
            expect(q).toHaveProperty('author');
            expect(q).toHaveProperty('tags');
            expect(Array.isArray(q.tags)).toBe(true);
        }
    });

    it('returns empty array when no quotes', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/quotes' });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([]);
    });

    it('filters by limit', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/quotes?limit=2' });
        expect(res.statusCode).toBe(200);
        expect(res.json().length).toBeLessThanOrEqual(2);
    });

    it('filters by author case-insensitive', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/quotes?author=Someone' });
        expect(res.statusCode).toBe(200);
        res.json().forEach((q: any) => {
            expect(q.author.toLowerCase()).toContain('someone');
        });
    });

    it('filters by tag', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/quotes?tag=happy' });
        expect(res.statusCode).toBe(200);
        res.json().forEach((q: any) => {
            expect(q.tags).toContain('happy');
        });
    });
});

describe('POST /api/quotes', () => {
    const validBody = {
        content: 'Học, học nữa, học mãi.',
        author: 'Lênin',
        tags: ['học tập', 'kiên trì'],
    };

    it('creates a quote and returns 201 with id, content, author, tags', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/quotes',
            headers: { 'x-api-key': 'secret_api_key_123', 'content-type': 'application/json' },
            payload: validBody,
        });

        expect(res.statusCode).toBe(201);
        const body = res.json();
        expect(body).toHaveProperty('id');
        expect(body.content).toBe(validBody.content);
        expect(body.author).toBe(validBody.author);
        expect(Array.isArray(body.tags)).toBe(true);
        expect(body.tags).toEqual(expect.arrayContaining(validBody.tags));
    });

    it('returns 400 when body is empty', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/quotes',
            headers: { 'x-api-key': 'secret_api_key_123', 'content-type': 'application/json' },
            payload: {},
        });

        expect(res.statusCode).toBe(400);
    });

    it('returns 400 when content is missing', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/quotes',
            headers: { 'x-api-key': 'secret_api_key_123', 'content-type': 'application/json' },
            payload: { author: 'Nguyễn Du' },
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

    it('returns 401 when X-API-Key header is invalid', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/quotes',
            headers: { 'x-api-key': 'wrong_key', 'content-type': 'application/json' },
            payload: validBody,
        });

        expect(res.statusCode).toBe(401);
    });
});

describe('GET /api/quotes/:id', () => {
    it('returns 200 and a single quote object for an existing ID', async () => {
        // Seed a quote directly into the mock store
        const seeded = {
            _id: 'test-id-123',
            id: 'test-id-123',
            content: 'Test quote content',
            author: 'Test Author',
            tags: ['test'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            toJSON() { return { ...this }; },
        };
        quoteStore.push(seeded);

        const res = await app.inject({ method: 'GET', url: '/api/quotes/test-id-123' });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toMatchObject({
            id: 'test-id-123',
            content: 'Test quote content',
            author: 'Test Author',
            tags: ['test'],
        });
        expect(body).toHaveProperty('createdAt');
        expect(body).toHaveProperty('updatedAt');
    });

    it('returns 404 for a non-existing ID', async () => {
        const nonExistingId = '00000000-0000-0000-0000-000000000000';
        const res = await app.inject({ method: 'GET', url: `/api/quotes/${nonExistingId}` });

        expect(res.statusCode).toBe(404);
    });
});
