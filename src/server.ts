import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastifyWebsocket from '@fastify/websocket';
import cronPlugin from './plugins/cron.plugin';

import 'dotenv/config';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth.route';
import { successResponse } from './helpers/response.helper';
import noteRoutes from './routes/note.route';
import tagRoutes from './routes/tag.route';
import { setupMiddleware } from './middleware';
import fastifyMailer from 'fastify-mailer';
import mailerConfig from './config/mailer';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyCors from '@fastify/cors';
import corsConfig from './config/cors.config';

const fastify = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

connectDatabase(fastify);

setupMiddleware(fastify);
fastify.register(fastifyMailer, mailerConfig);
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  },
  saveUninitialized: false,
  rolling: true,
});
fastify.register(fastifyCors, corsConfig);
fastify.register(fastifyWebsocket);

fastify.register(cronPlugin);

// Register routes
fastify.register(authRoutes);
fastify.register(noteRoutes);
fastify.register(tagRoutes);

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
