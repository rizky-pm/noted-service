import { FastifyInstance } from 'fastify';
import {
  registerUser,
  loginUser,
  logoutUser,
  getAuthenticatedUser,
  editUser,
  changePassword,
} from '../controllers/auth.controller';

export default async function authRoutes(server: FastifyInstance) {
  server.post('/api/v1/auth/register', registerUser);
  server.post('/api/v1/auth/login', loginUser);
  server.post(
    '/api/v1/auth/logout',
    { preHandler: server.authenticate },
    logoutUser
  );
  server.get(
    '/api/v1/auth/me',
    { preHandler: server.authenticate },
    getAuthenticatedUser
  );

  server.patch<{
    Body: {
      avatar: string | null;
      username: string;
    };
  }>(
    '/api/v1/auth/edit-profile',
    { preHandler: server.authenticate },
    editUser
  );

  server.patch<{
    Body: {
      oldPassword: string;
      newPassword: string;
    };
  }>(
    '/api/v1/auth/change-password',
    { preHandler: server.authenticate },
    changePassword
  );
}
