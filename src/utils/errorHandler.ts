import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from './logger.js';

export const errorHandler = async (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  logger.error(error);

  if (error.validation) {
    return reply.code(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message,
    });
  }

  if (error.code === 'FST_ERR_VALIDATION') {
    return reply.code(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message,
    });
  }

  return reply.code(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
};