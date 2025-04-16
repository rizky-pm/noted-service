import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/session';
import fastifyMailer from 'fastify-mailer';
import type { FastifyMailerInstance } from 'fastify-mailer';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    mailer: FastifyMailerInstance;
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
    mailer: FastifyMailerInstance;
  }
}
