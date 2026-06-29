import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { QuoteService } from '../src/services/quoteService';

class TestRateLimitStore {
    private records = new Map<string, { current: number; ttl: number; iterationStartMs: number }>();

    incr(
        key: string,
        callback: (error: Error | null, result?: { current: number; ttl: number }) => void,
        timeWindow = 60000,
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

const quoteService = {
    async getAll() {
        return [];
    },
    async getById() {
        return null;
    },
    async getRandom() {
        return null;
    },
    async create() {
        return {
            id: 'test-id',
            content: 'Test',
            author: 'Test',
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    },
    async update() {
        return null;
    },
    async delete() {
        return null;
    },
} as unknown as QuoteService;

describe('Rate Limiting', () => {
    let app: FastifyInstance;

    beforeEach(async () => {
        app = buildApp({
            quoteService,
            rateLimitMax: 1,
            rateLimitWindow: 10000,
            rateLimitStore: TestRateLimitStore,
        });
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
    });

    it('limits quote API requests per client IP', async () => {
        const first = await app.inject({
            method: 'GET',
            url: '/api/quotes',
            remoteAddress: '10.0.0.1',
        });
        const second = await app.inject({
            method: 'GET',
            url: '/api/quotes',
            remoteAddress: '10.0.0.1',
        });

        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(429);
        expect(second.headers['retry-after']).toBeDefined();
    });

    it('uses trusted x-forwarded-for client IP behind a proxy', async () => {
        const first = await app.inject({
            method: 'GET',
            url: '/api/quotes',
            remoteAddress: '10.0.0.1',
            headers: { 'x-forwarded-for': '203.0.113.10' },
        });
        const second = await app.inject({
            method: 'GET',
            url: '/api/quotes',
            remoteAddress: '10.0.0.1',
            headers: { 'x-forwarded-for': '203.0.113.11' },
        });

        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);
    });

    it('does not rate limit root, health, or docs routes', async () => {
        for (const url of ['/', '/healthz', '/api/docs']) {
            const first = await app.inject({ method: 'GET', url, remoteAddress: '10.0.0.2' });
            const second = await app.inject({ method: 'GET', url, remoteAddress: '10.0.0.2' });

            expect(first.statusCode).toBe(200);
            expect(second.statusCode).toBe(200);
            expect(second.headers['x-ratelimit-remaining']).toBeUndefined();
        }
    });
});
