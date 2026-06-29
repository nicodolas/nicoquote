import { FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodSchema } from 'zod';

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
import { zodToJsonSchema } from 'zod-to-json-schema';

export function zodToJsonSchemaExport(schema: any): any {
    const json: any = zodToJsonSchema(schema);
    json.required = json.required || [];
    return json;
}