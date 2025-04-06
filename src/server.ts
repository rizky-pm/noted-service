import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastifyCookie from '@fastify/cookie';
import fastifyWebsocket from '@fastify/websocket';

import 'dotenv/config';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth.route';
import { errorResponse, successResponse } from './helpers/response.helper';
import noteRoutes from './routes/note.route';
import tagRoutes from './routes/tag.route';
import fastifySession from '@fastify/session';
import { REQUEST_ERROR } from './constant';
import fastifyCors from '@fastify/cors';

const fastify = Fastify().withTypeProvider<TypeBoxTypeProvider>();

// Connect to MongoDB Atlas
connectDatabase(fastify);

// Register fastify CORS
fastify.register(fastifyCors, {
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});

// Register fastify session based authentication
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

fastify.decorate(
  'authenticate',
  async function (request: FastifyRequest, reply: FastifyReply) {
    const { user } = request.session;
    if (!user) {
      return reply
        .status(401)
        .send(
          errorResponse(
            REQUEST_ERROR.unauthorized.message,
            REQUEST_ERROR.unauthorized.code
          )
        );
    }
  }
);

fastify.register(fastifyWebsocket);

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
