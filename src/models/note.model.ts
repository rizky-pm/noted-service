import { Collection } from 'mongodb';
import { FastifyInstance } from 'fastify';
import { INote } from '../types/note.type';

export const getNoteCollection = (
  server: FastifyInstance
): Collection<INote> => {
  if (!server.mongo.db) {
    throw new Error('Failed to connect to Note Collection');
  }

  return server.mongo.db.collection<INote>('notes');
};
