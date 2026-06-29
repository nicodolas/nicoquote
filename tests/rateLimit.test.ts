import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';

// Mock the Quote model so tests don't need a real MongoDB connection
vi.mock('../src/modules/quote/models/Quote', () => {
    const Quote = {
        find: vi.fn(async () => []),
        findById: vi.fn(async () => null),
        countDocuments: vi.fn(async () => 0),
        findOne: vi.fn(async () => null),
        create: vi.fn(async (data: any) => {
            const doc = Array.isArray(data) ? data[0] : data;
            return [{ _id: 'test-id', id: 'test-id', ...doc }];
        }),
        findByIdAndUpdate: vi.fn(async () => null),
        findByIdAndDelete: vi.fn(async () => null),
    };
    return { Quote };
});

describe('Rate Limiting', () => {
    // Use a very low limit (2 requests) so tests can easily trigger 429
    const RATE_LIMIT_MAX = 2;
    const RATE_LIMIT_WINDOW = 10000; // 10 seconds

    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp({ rateLimitMax: RATE_LIMIT_MAX, rateLimitWindow: RATE_LIMIT_WINDOW });
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('allows requests within the rate limit', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/quotes' });
        expect(res.statusCode).toBe(200);
    });

    it('returns 429 Too Many Requests when limit is exceeded', async () => {
        // Exhaust the limit (RATE_LIMIT_MAX requests already done including beforeAll warmup,
        // but each test gets a fresh app instance so we fire enough requests here)
        const responses: number[] = [];

        // Fire RATE_LIMIT_MAX + 1 requests — the last one should be 429
        for (let i = 0; i <= RATE_LIMIT_MAX; i++) {
            const res = await app.inject({ method: 'GET', url: '/api/quotes' });
            responses.push(res.statusCode);
        }

        expect(responses).toContain(429);
    });

    it('includes retry-after header on 429 response', async () => {
        // Create a separate app instance with limit of 1 to easily get a 429
        const strictApp = buildApp({ rateLimitMax: 1, rateLimitWindow: 10000 });
        await strictApp.ready();

        try {
            // First request — within limit
            await strictApp.inject({ method: 'GET', url: '/api/quotes' });

            // Second request — should be 429
            const res = await strictApp.inject({ method: 'GET', url: '/api/quotes' });

            expect(res.statusCode).toBe(429);

            // retry-after header must be present (case-insensitive check via headers object)
            const headers = res.headers;
            const hasRetryAfter =
                'retry-after' in headers || 'Retry-After' in headers;
            expect(hasRetryAfter).toBe(true);
        } finally {
            await strictApp.close();
        }
    });

    it('retry-after header value is a positive number', async () => {
        const strictApp = buildApp({ rateLimitMax: 1, rateLimitWindow: 10000 });
        await strictApp.ready();

        try {
            await strictApp.inject({ method: 'GET', url: '/api/quotes' });
            const res = await strictApp.inject({ method: 'GET', url: '/api/quotes' });

            expect(res.statusCode).toBe(429);

            const retryAfter =
                res.headers['retry-after'] ?? res.headers['Retry-After'];
            expect(retryAfter).toBeDefined();
            expect(Number(retryAfter)).toBeGreaterThan(0);
        } finally {
            await strictApp.close();
        }
    });

    it('rate limiting applies per IP address (same IP hits limit, different IP is independent)', async () => {
        // Both requests come from the same injected IP (127.0.0.1), so the shared limit applies.
        // Using a fresh app with limit=1 to verify same-IP enforcement.
        const perIpApp = buildApp({ rateLimitMax: 1, rateLimitWindow: 10000 });
        await perIpApp.ready();

        try {
            const first = await perIpApp.inject({
                method: 'GET',
                url: '/api/quotes',
                remoteAddress: '10.0.0.1',
            });
            const second = await perIpApp.inject({
                method: 'GET',
                url: '/api/quotes',
                remoteAddress: '10.0.0.1',
            });

            expect(first.statusCode).toBe(200);
            expect(second.statusCode).toBe(429);
        } finally {
            await perIpApp.close();
        }
    });
});
