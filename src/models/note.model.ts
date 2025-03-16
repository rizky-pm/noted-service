import { Collection } from 'mongodb';
import { FastifyInstance } from 'fastify';

export const getNoteCollection = (server: FastifyInstance): Collection => {
  if (!server.mongo.db) {
    throw new Error('Failed to connect to Note Collection');
  }

  return server.mongo.db.collection('notes');
};
