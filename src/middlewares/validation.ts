import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function validate(schema: ZodSchema) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const result = schema.safeParse(request.body);
        if (!result.success) {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Validation failed',
                details: result.error.flatten().fieldErrors,
            });
        }
        request.body = result.data;
    };
}

export function zodToJsonSchemaExport(schema: ZodSchema): Record<string, unknown> {
    const convert = zodToJsonSchema as (schema: ZodSchema) => unknown;
    const json = convert(schema) as Record<string, unknown>;
    json.required = json.required || [];
    return json;
}
