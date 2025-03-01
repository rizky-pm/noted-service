import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET_KEY as string,
  });

  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
        console.log('✅ Auth plugin successfully registered');
      } catch (error) {
        reply
          .status(401)
          .send({ message: 'Unauthorized', code: 'unauthorized' });
      }
    }
  );
});
