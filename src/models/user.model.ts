import { Collection } from 'mongodb';
import { FastifyInstance } from 'fastify';
import { IUser } from '../types/user.type';

export const getUserCollection = (
  server: FastifyInstance
): Collection<IUser> => {
  if (!server.mongo.db) {
    throw new Error('MongoDB is not connected!');
  }

  return server.mongo.db.collection<IUser>('users');
};
