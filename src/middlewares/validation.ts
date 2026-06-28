import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodSchema } from 'zod';
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

export function zodToJsonSchemaExport(schema: ZodSchema): any {
    const json: any = zodToJsonSchema(schema);
    // Ensure 'required' is an array (Fastify expects array even if empty)
    if (!Array.isArray(json.required)) {
        json.required = [];
    }
    return json;
}