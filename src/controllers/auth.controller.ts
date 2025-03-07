import bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import { FastifyRequest, FastifyReply } from 'fastify';

import { getUserCollection } from '../models/user.model';
import { UserCredentials } from '../types/user.type';
import { errorResponse, successResponse } from '../helpers/response.helper';

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
    return reply.send(errorResponse('Email or username already exists'));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await userCollection.insertOne({
    username,
    email,
    password: hashedPassword,
    createdAt: dayjs().unix(),
  });

  if (!result.insertedId) {
    return reply.send(
      errorResponse('Registration failed, please try again later', 500)
    );
  }

  return reply.send(successResponse('User registered successfully', 201));
};

export const loginUser = async (
  request: FastifyRequest<{
    Body: {
      username: UserCredentials['username'];
      password: UserCredentials['password'];
    };
  }>,
  reply: FastifyReply
) => {
  const { username, password } = request.body;
  const userCollection = getUserCollection(request.server);
  const user = await userCollection.findOne({ username });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return reply
      .status(401)
      .send({ message: 'Invalid username or password', code: 401 });
  }

  request.session.user = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };

  return reply
    .status(200)
    .send(successResponse('Login successful!', 200, request.session.user));
};

export const logoutUser = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  request.session.destroy((err) => {
    if (err) {
      console.error('Logout Error:', err);
      return reply.status(500).send({ message: 'Failed to logout' });
    }
    return reply.send(successResponse('Logout successful!', 200));
  });
};

export const getAuthenticatedUser = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (!request.session.user) {
    return reply.status(401).send({
      code: 401,
      message: 'Unauthorized',
      status: 'error',
    });
  }

  return reply.status(200).send({
    id: request.session.user.id,
    username: request.session.user.username,
    email: request.session.user.email,
  });
};
