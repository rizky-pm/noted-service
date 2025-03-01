import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import 'dotenv/config';
import { connectDatabase } from './config/database';

const fastify = Fastify().withTypeProvider<TypeBoxTypeProvider>();

// Connect to MongoDB Atlas
connectDatabase(fastify);

fastify.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log(`Server listening at ${address}`);
});
