import bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import { FastifyRequest, FastifyReply } from 'fastify';

import { getUserCollection } from '../models/user.model';
import { UserCredentials } from '../types/user.type';
import { errorResponse } from '../utils/response.util';

export const registerUser = async (
  requet: FastifyRequest<{ Body: UserCredentials }>,
  reply: FastifyReply
) => {
  const { username, email, password } = requet.body;
  const userCollection = getUserCollection(requet.server);

  const existingUser = await userCollection.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    return reply.send(errorResponse());
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await userCollection.insertOne({
    username,
    email,
    password: hashedPassword,
    createdAt: dayjs().unix(),
  });

  if (!result.insertedId) {
    return reply
      .status(500)
      .send({ message: 'Registration failed, please try again later.' });
  }

  return reply.send(201).send({ message: 'User registered successfully' });
};
