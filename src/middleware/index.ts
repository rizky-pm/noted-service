import { FastifyInstance, FastifyRequest } from 'fastify';
import { authorization } from '../decorators/authorization';

export const setupMiddleware = (fastify: FastifyInstance) => {
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    if (!request.mailer) {
      request.mailer = fastify.mailer;
    }
  });

  fastify.decorate('authenticate', authorization);
};
