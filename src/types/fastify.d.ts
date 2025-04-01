import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/session';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      avatar: string | null;
    };
  }

  interface FastifyRequest {
    user: {
      userId: string;
      username: string;
      email: string;
      avatar: string | null;
    };
  }
}
