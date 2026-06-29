import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function validate(schema: z.ZodTypeAny) {
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

export function zodToJsonSchemaExport(schema: z.ZodTypeAny): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (zodToJsonSchema as any)(schema);
}
