import { Collection } from 'mongodb';
import { FastifyInstance } from 'fastify';
import { IUser } from '../types/user.type';

export const getUserCollection = (
  server: FastifyInstance
): Collection<IUser> => {
  if (!server.mongo.db) {
    throw new Error('Failed to connect to User Collection');
  }

  return server.mongo.db.collection<IUser>('users');
};
