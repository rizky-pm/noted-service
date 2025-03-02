import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { errorResponse } from '../helpers/response.helper';
import { IJwtUser } from '../types/user.type';

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET_KEY as string,
  });

  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        const token = request.cookies.refreshToken;
        if (!token) throw new Error('No token provided');

        request.user = await request.server.jwt.verify<IJwtUser>(token);
        console.log('Decoded User:', request.user);
      } catch (err) {
        return reply.status(401).send(errorResponse('Unauthorized', 401));
      }
    }
  );

  console.log('✅ Auth plugin successfully registered');
});
