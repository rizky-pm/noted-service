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

  if (!user)
    return reply.send(errorResponse('Invalid username or password', 401));

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid)
    return reply.send(errorResponse('Invalid username or password', 401));

  const accessToken = request.server.jwt.sign(
    { userId: user._id },
    { expiresIn: '15m' }
  );
  const refreshToken = request.server.jwt.sign(
    { userId: user._id },
    { expiresIn: '7d' }
  );

  reply
    .setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })
    .send(successResponse('Login successfull!', 200, { accessToken }));
};

export const logoutUser = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  return reply
    .clearCookie('refreshToken')
    .send(successResponse('Logout successfull!'));
};
