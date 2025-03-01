import fastifyMongodb from '@fastify/mongodb';
import { FastifyInstance } from 'fastify';
import 'dotenv/config';

export async function connectDatabase(server: FastifyInstance) {
  server.register(fastifyMongodb, {
    forceClose: true,
    url: process.env.MONGODB_URI,
  });
}
