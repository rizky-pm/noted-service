// import fastifyCookie from '@fastify/cookie';
// import fastifySession from '@fastify/session';
// import { FastifyInstance } from 'fastify';

// export const setupSession = (fastify: FastifyInstance) => {
//   fastify.register(fastifyCookie);
//   fastify.register(fastifySession, {
//     secret: process.env.SESSION_SECRET || 'supersecretkey',
//     cookie: {
//       secure: process.env.NODE_ENV === 'production',
//       httpOnly: true,
//       sameSite: 'strict',
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//       path: '/',
//     },
//     saveUninitialized: false,
//     rolling: true,
//   });
// };
