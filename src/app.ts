import Fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { IncomingMessage, ServerResponse } from 'http';
import quoteRoutes from './routes/quote.js';
import { env } from './config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LANDING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NicoQuote API</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            background: #f8f9fa;
            color: #333;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #6366f1;
            text-align: center;
            margin-bottom: 30px;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .feature {
            background: #f0f4ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #6366f1;
        }
        .feature h3 {
            margin-top: 0;
            color: #475569;
        }
        .endpoint {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
        }
        .method {
            font-weight: bold;
            color: #6366f1;
        }
        .btn {
            display: inline-block;
            background: #6366f1;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 5px;
        }
        .docs-btn {
            background: #10b981;
        }
        code {
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>NicoQuote API</h1>
        <p><em>RESTful API for managing Vietnamese quotes with authentication and rate limiting</em></p>
        <h2>Features</h2>
        <div class="features">
            <div class="feature"><h3>Quote Management</h3><p>Create, read, update, and delete Vietnamese quotes.</p></div>
            <div class="feature"><h3>Authentication</h3><p>API key protection for write operations.</p></div>
            <div class="feature"><h3>Rate Limiting</h3><p>Smart rate limiting to prevent abuse.</p></div>
            <div class="feature"><h3>Documentation</h3><p>Interactive Swagger UI at /api/docs.</p></div>
        </div>
        <h2>Quick Start</h2>
        <p>Use these endpoints to get started:</p>
        <div class="endpoint"><span class="method">GET</span><code>/api/quotes?limit=10</code></div>
        <div class="endpoint"><span class="method">GET</span><code>/api/quotes/random</code></div>
        <div class="endpoint"><span class="method">GET</span><code>/api/quotes/123</code></div>
        <div class="endpoint"><span class="method">POST</span><code>/api/quotes</code></div>
        <p><strong>Required headers for POST/PUT/PATCH/DELETE:</strong></p>
        <code>X-API-Key: your-api-key</code>
        <div style="text-align: center; margin-top: 30px;">
            <a href="/api/docs" class="btn docs-btn">View API Documentation</a>
            <a href="/healthz" class="btn">Health Check</a>
        </div>
    </div>
</body>
</html>`;

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
                description: 'API for managing quotes with authentication and rate limiting',
                version: '1.0.0',
            },
            servers: [
                {
                    url: '/api',
                },
            ],
        },
    });

    // Swagger UI
    app.register(swaggerUi, {
        routePrefix: '/api/docs',
    });

    // Landing page - Use fs.readFileSync with import
    app.get('/', async (_req, reply) => {
        reply.type('text/html');
        const htmlPath = [
            path.join(__dirname, 'views', 'index.html'),
            path.resolve(__dirname, '../src/views/index.html'),
        ].find((candidate) => fs.existsSync(candidate));

        if (!htmlPath) {
            return reply.send(LANDING_PAGE_HTML);
        }

        reply.send(fs.readFileSync(htmlPath, 'utf8'));
    });

    // Health check
    app.get('/healthz', async () => ({ status: 'ok' }));

    // Quote routes
    app.register(quoteRoutes, { prefix: '/api/quotes' });

    return app;
}

let serverlessAppPromise: Promise<FastifyInstance> | undefined;

async function getServerlessApp(): Promise<FastifyInstance> {
    if (!serverlessAppPromise) {
        const app = buildApp();
        serverlessAppPromise = Promise.resolve(app.ready()).then(() => app);
    }

    return serverlessAppPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const app = await getServerlessApp();
    app.server.emit('request', req, res);
}
