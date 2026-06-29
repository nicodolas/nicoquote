import { FastifyPluginAsync } from 'fastify';
import { apiKeyAuth } from '../middlewares/auth.js';
import { validate, zodToJsonSchemaExport } from '../middlewares/validation.js';
import { createQuoteSchema, updateQuoteSchema } from '../modules/quote/schema.js';
import { QuoteService, quoteService } from '../services/quoteService.js';
import { renderQuoteSVG } from '../utils/quoteImage.js';

const quoteResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    content: { type: 'string' },
    author: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'content', 'author', 'createdAt', 'updatedAt'],
} as const;

const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['statusCode', 'error', 'message'],
} as const;

const createQuoteJsonSchema = zodToJsonSchemaExport(createQuoteSchema);
const updateQuoteJsonSchema = zodToJsonSchemaExport(updateQuoteSchema);

const getQuotesQuerySchema = {
  type: 'object',
  properties: {
    author: { type: 'string' },
    tag: { type: 'string' },
    limit: { type: 'string' },
  },
  additionalProperties: false,
  required: [],
} as const;

const getQuotesParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
  additionalProperties: false,
} as const;

export function buildQuoteRoutes(service: QuoteService = quoteService): FastifyPluginAsync {
  return async (fastify) => {
    // GET /api/quotes — public
    fastify.get(
      '/',
      {
        config: { rateLimit: { groupId: 'quotes' } },
        schema: {
          querystring: getQuotesQuerySchema,
          response: {
            200: {
              type: 'array',
              items: quoteResponseSchema,
            },
            400: errorResponseSchema,
          },
        },
      },
      async (req, reply) => {
        const allowedQueryKeys = new Set(['author', 'tag', 'limit']);
        const searchParams = new URL(req.url, 'http://localhost').searchParams;
        const unexpectedQueryKey = Array.from(searchParams.keys()).find((key) => !allowedQueryKeys.has(key));

        if (unexpectedQueryKey) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: `Unexpected query parameter: ${unexpectedQueryKey}`,
          });
        }

        const { author, tag, limit } = req.query as {
          author?: string;
          tag?: string;
          limit?: string;
        };

        const parsedLimit = limit === undefined ? undefined : Number(limit);
        if (
          parsedLimit !== undefined &&
          (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)
        ) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'limit must be an integer between 1 and 100',
          });
        }

        const quotes = await service.getAll({
          author,
          tag,
          limit: parsedLimit,
        });

        return reply.send(quotes);
      },
    );

    // GET /api/quotes/random — public
    fastify.get(
      '/random',
      {
        config: { rateLimit: { groupId: 'quotes' } },
        schema: {
          response: {
            200: quoteResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (_req, reply) => {
        const quote = await service.getRandom();
        if (!quote) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'No quotes found',
          });
        }
        return reply.send(quote);
      },
    );

    // GET /api/quotes/random/image — public, returns SVG for GitHub README
    fastify.get(
      '/random/image',
      {
        config: { rateLimit: { groupId: 'quotes' } },
        schema: {
          tags: ['quotes'],
          summary: 'Get a random quote as an SVG image',
          description: [
            'Returns a random quote rendered as an SVG image.',
            'Designed for embedding in GitHub READMEs via an `<img>` tag.',
            'Supports full Vietnamese Unicode via embedded Google Fonts.',
            'All query parameters are optional.',
          ].join(' '),
          querystring: {
            type: 'object',
            properties: {
              // ── Theme & Color ──────────────────────────────────────────
              theme: {
                type: 'string',
                enum: ['dark', 'light', 'ocean', 'rose', 'forest', 'sunset', 'mono'],
                default: 'dark',
                description:
                  'Preset color theme. Individual color params (bg/color/accent/authorColor) override the preset.',
              },
              bg: {
                type: 'string',
                description: 'Background color — hex without # (e.g. `0d1117`) or CSS name.',
              },
              color: {
                type: 'string',
                description: 'Quote text color — hex without # or CSS name.',
              },
              authorColor: {
                type: 'string',
                description: 'Author name color — hex without # or CSS name. Falls back to accent.',
              },
              accent: {
                type: 'string',
                description: 'Accent / left-border color — hex without # or CSS name.',
              },
              quoteMarkOpacity: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                default: 0.5,
                description: 'Opacity of the decorative opening quote mark (0.0–1.0).',
              },
              // ── Typography ─────────────────────────────────────────────
              font: {
                type: 'string',
                enum: ['bevietnampro', 'notosans', 'lato', 'merriweather', 'playfair', 'roboto', 'inter'],
                default: 'bevietnampro',
                description:
                  'Font preset. All fonts are loaded from Google Fonts and support Vietnamese. ' +
                  'bevietnampro = Be Vietnam Pro (recommended), notosans = Noto Sans, ' +
                  'lato = Lato, merriweather = Merriweather, playfair = Playfair Display, ' +
                  'roboto = Roboto, inter = Inter.',
              },
              fontSize: {
                type: 'integer',
                minimum: 12,
                maximum: 60,
                default: 20,
                description: 'Quote content font size in pixels (12–60).',
              },
              authorSize: {
                type: 'integer',
                minimum: 10,
                maximum: 48,
                description: 'Author name font size in pixels (10–48). Default: fontSize × 0.82.',
              },
              italic: {
                type: 'boolean',
                default: true,
                description: 'Render quote content in italic.',
              },
              boldAuthor: {
                type: 'boolean',
                default: true,
                description: 'Render author name in bold.',
              },
              letterSpacing: {
                type: 'number',
                minimum: -0.05,
                maximum: 0.2,
                default: 0.01,
                description: 'Letter spacing for content in em units.',
              },
              // ── Layout ─────────────────────────────────────────────────
              width: {
                type: 'integer',
                minimum: 300,
                maximum: 1200,
                default: 800,
                description: 'Image width in pixels (300–1200).',
              },
              radius: {
                type: 'integer',
                minimum: 0,
                maximum: 40,
                default: 12,
                description: 'Card border radius in pixels (0–40).',
              },
              padding: {
                type: 'integer',
                minimum: 16,
                maximum: 80,
                default: 40,
                description: 'Inner padding in pixels (16–80).',
              },
              borderWidth: {
                type: 'integer',
                minimum: 0,
                maximum: 12,
                default: 4,
                description: 'Left accent bar width in pixels. Set to 0 to hide.',
              },
              showQuoteIcon: {
                type: 'boolean',
                default: true,
                description: 'Show decorative opening quote mark.',
              },
            },
            additionalProperties: false,
          },
          response: {
            200: {
              description: 'SVG image of a random quote (image/svg+xml)',
              type: 'string',
            },
            404: errorResponseSchema,
          },
        },
      },
      async (req, reply) => {
        const quote = await service.getRandom();
        if (!quote) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'No quotes found',
          });
        }

        const q = req.query as {
          theme?: 'dark' | 'light' | 'ocean' | 'rose' | 'forest' | 'sunset' | 'mono';
          bg?: string;
          color?: string;
          authorColor?: string;
          accent?: string;
          quoteMarkOpacity?: string;
          font?: 'bevietnampro' | 'notosans' | 'lato' | 'merriweather' | 'playfair' | 'roboto' | 'inter';
          fontSize?: string;
          authorSize?: string;
          italic?: string;
          boldAuthor?: string;
          letterSpacing?: string;
          width?: string;
          radius?: string;
          padding?: string;
          borderWidth?: string;
          showQuoteIcon?: string;
        };

        const toBool = (v: string | undefined, fallback: boolean) =>
          v === undefined ? fallback : v === 'true' || v === '1';

        const svg = renderQuoteSVG({
          content: quote.content,
          author: quote.author,
          // Color
          theme: q.theme,
          bg: q.bg,
          color: q.color,
          authorColor: q.authorColor,
          accent: q.accent,
          quoteMarkOpacity: q.quoteMarkOpacity !== undefined ? Number(q.quoteMarkOpacity) : undefined,
          // Typography
          font: q.font,
          fontSize: q.fontSize !== undefined ? Number(q.fontSize) : undefined,
          authorSize: q.authorSize !== undefined ? Number(q.authorSize) : undefined,
          italic: toBool(q.italic, true),
          boldAuthor: toBool(q.boldAuthor, true),
          letterSpacing: q.letterSpacing !== undefined ? Number(q.letterSpacing) : undefined,
          // Layout
          width: q.width !== undefined ? Number(q.width) : undefined,
          radius: q.radius !== undefined ? Number(q.radius) : undefined,
          padding: q.padding !== undefined ? Number(q.padding) : undefined,
          borderWidth: q.borderWidth !== undefined ? Number(q.borderWidth) : undefined,
          showQuoteIcon: toBool(q.showQuoteIcon, true),
        });

        return reply
          .header('Content-Type', 'image/svg+xml')
          .header('Cache-Control', 'no-cache, no-store, must-revalidate')
          .send(svg);
      },
    );

    // GET /api/quotes/:id — public
    fastify.get(
      '/:id',
      {
        config: { rateLimit: { groupId: 'quotes' } },
        schema: {
          params: getQuotesParamsSchema,
          response: {
            200: quoteResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const quote = await service.getById(id);
        if (!quote) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Quote not found',
          });
        }
        return reply.send(quote);
      },
    );

    // POST /api/quotes — requires auth + validation
    fastify.post(
      '/',
      {
        config: { rateLimit: { groupId: 'quotes' } },
        preHandler: [apiKeyAuth, validate(createQuoteSchema)],
        schema: {
          body: createQuoteJsonSchema,
          response: {
            201: quoteResponseSchema,
          },
        },
      },
      async (req, reply) => {
        const data = req.body as {
          content: string;
          author: string;
          tags?: string[];
        };
        const quote = await service.create(data);
        return reply.code(201).send(quote);
      },
    );

    // PUT /api/quotes/:id — requires auth + validation
    fastify.put(
      '/:id',
      {
        config: { rateLimit: { groupId: 'quotes' } },
        preHandler: [apiKeyAuth, validate(updateQuoteSchema)],
        schema: {
          params: getQuotesParamsSchema,
          body: updateQuoteJsonSchema,
          response: {
            200: quoteResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const data = req.body as {
          content?: string;
          author?: string;
          tags?: string[];
        };
        const quote = await service.update(id, data);
        if (!quote) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Quote not found',
          });
        }
        return reply.send(quote);
      },
    );

    // PATCH /api/quotes/:id — partial update, requires auth + validation
    fastify.patch(
      '/:id',
      {
        config: { rateLimit: { groupId: 'quotes' } },
        preHandler: [apiKeyAuth, validate(updateQuoteSchema)],
        schema: {
          params: getQuotesParamsSchema,
          body: updateQuoteJsonSchema,
          response: {
            200: quoteResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const data = req.body as {
          content?: string;
          author?: string;
          tags?: string[];
        };
        const quote = await service.update(id, data);
        if (!quote) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Quote not found',
          });
        }
        return reply.send(quote);
      },
    );

    // DELETE /api/quotes/:id — requires auth only
    fastify.delete(
      '/:id',
      {
        config: { rateLimit: { groupId: 'quotes' } },
        preHandler: [apiKeyAuth],
        schema: {
          params: getQuotesParamsSchema,
          response: {
            204: { type: 'null' },
            404: errorResponseSchema,
          },
        },
      },
      async (req, reply) => {
        const { id } = req.params as { id: string };
        const deleted = await service.delete(id);
        if (!deleted) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'Quote not found',
          });
        }
        return reply.code(204).send();
      },
    );
  };
}

export default buildQuoteRoutes();
