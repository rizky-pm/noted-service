import Fastify, { FastifyRequest } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastifyCookie from '@fastify/cookie';

import 'dotenv/config';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth.route';
import authPlugin from './plugins/auth.plugin';
import { successResponse } from './helpers/response.helper';
import noteRoutes from './routes/note.route';

const fastify = Fastify().withTypeProvider<TypeBoxTypeProvider>();

// Connect to MongoDB Atlas
connectDatabase(fastify);

// Register fastify cookie
fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET_KEY,
  hook: 'onRequest',
  parseOptions: {},
});

// Register plugins
fastify.register(authPlugin);

// Register routes
fastify.register(authRoutes);
fastify.register(noteRoutes);

fastify.get('/check-health', async (request, reply) => {
  return reply.send(
    successResponse('Ok', 200, {
      message: 'Healthy',
    })
  );
});

fastify.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log(`Server listening at ${address}`);
});
