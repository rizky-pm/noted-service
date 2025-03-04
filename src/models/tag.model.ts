import { Collection } from 'mongodb';
import { FastifyInstance } from 'fastify';

const getTagCollection = (server: FastifyInstance): Collection => {
  if (!server.mongo.db) {
    throw new Error('Failed to connect to Tag Collection');
  }

  return server.mongo.db.collection('tags');
};

export default getTagCollection;
