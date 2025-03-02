import { FastifyInstance } from 'fastify';
import {
  registerUser,
  loginUser,
  logoutUser,
} from '../controllers/auth.controller';

export default async function authRoutes(server: FastifyInstance) {
  server.post('/api/v1/auth/register', registerUser);
  server.post('/api/v1/auth/login', loginUser);
  server.post(
    '/api/v1/auth/logout',
    { preHandler: server.authenticate },
    logoutUser
  );
}
