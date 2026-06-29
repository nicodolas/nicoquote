import { FastifyPluginAsync } from 'fastify';
import { apiKeyAuth } from '../middlewares/auth.js';
import { validate, zodToJsonSchemaExport } from '../middlewares/validation.js';
import { createQuoteSchema, updateQuoteSchema } from '../modules/quote/schema.js';
import { quoteService } from '../services/quoteService.js';

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

const quoteRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/quotes — public
  fastify.get(
    '/',
    {
      schema: {
        querystring: getQuotesQuerySchema,
        response: {
          200: {
            type: 'array',
            items: quoteResponseSchema,
          },
        },
      },
    },
    async (req, reply) => {
      const { author, tag, limit } = req.query as {
        author?: string;
        tag?: string;
        limit?: string;
      };

      const quotes = await quoteService.getAll({
        author,
        tag,
        limit: limit ? Number(limit) : undefined,
      });

      return reply.send(quotes);
    },
  );

  // GET /api/quotes/random — public
  fastify.get(
    '/random',
    {
      schema: {
        response: {
          200: quoteResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (_req, reply) => {
      const quote = await quoteService.getRandom();
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

  // GET /api/quotes/:id — public
  fastify.get(
    '/:id',
    {
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
      const quote = await quoteService.getById(id);
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
      preHandler: [apiKeyAuth, validate(createQuoteSchema)],
      schema: {
        body: { ...createQuoteJsonSchema, required: [] },
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
      const quote = await quoteService.create(data);
      return reply.code(201).send(quote);
    },
  );

  // PUT /api/quotes/:id — requires auth + validation
  fastify.put(
    '/:id',
    {
      preHandler: [apiKeyAuth, validate(updateQuoteSchema)],
      schema: {
        params: getQuotesParamsSchema,
        body: { ...updateQuoteJsonSchema, required: [] },
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
      const quote = await quoteService.update(id, data);
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
      preHandler: [apiKeyAuth, validate(updateQuoteSchema)],
      schema: {
        params: getQuotesParamsSchema,
        body: { ...updateQuoteJsonSchema, required: [] },
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
      const quote = await quoteService.update(id, data);
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
      const deleted = await quoteService.delete(id);
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

export default quoteRoutes;