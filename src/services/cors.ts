import fastifyCors from '@fastify/cors';

export const setupCors = (fastify: any) => {
  fastify.register(fastifyCors, {
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });
};
