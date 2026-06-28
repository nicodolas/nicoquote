import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env';

export const apiKeyAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || apiKey !== env.API_KEY) {
        return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid or missing API key',
        });
    }
};
