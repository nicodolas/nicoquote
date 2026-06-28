import Fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import quoteRoutes from './routes/quote';
import { env } from './config/env';

export interface AppOptions {
    rateLimitMax?: number;
    rateLimitWindow?: number;
}

export function buildApp(options: AppOptions = {}): FastifyInstance {
    const app = Fastify({ logger: false });

    const max = options.rateLimitMax ?? env.RATE_LIMIT_REQUESTS;
    const timeWindow = options.rateLimitWindow ?? env.RATE_LIMIT_WINDOW_MS;

    // Security headers
    app.register(helmet);

    // Rate limiting
    app.register(rateLimit, {
        max,
        timeWindow,
        addHeaders: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
            'retry-after': true,
        },
    });

    // Swagger documentation
    app.register(swagger, {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'NicoQuote API',
                description: 'API for managing quotes',
                version: '1.0.0',
            },
        },
    });
    // Swagger UI
    app.register(swaggerUi, {
        routePrefix: '/api/docs',
    });

    // Health check
    app.get('/healthz', async () => ({ status: 'ok' }));

    // Quote routes
    app.register(quoteRoutes, { prefix: '/api/quotes' });

    return app;
}