import bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import { FastifyRequest, FastifyReply } from 'fastify';

import { getUserCollection } from '../models/user.model';
import { UserCredentials } from '../types/user.type';
import { errorResponse, successResponse } from '../helpers/response.helper';
import { REQUEST_ERROR } from '../constant';
import { ObjectId } from 'mongodb';

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
    return reply
      .status(400)
      .send(errorResponse('Email or username already exists'));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await userCollection.insertOne({
    username,
    email,
    avatar: null,
    password: hashedPassword,
    createdAt: dayjs().unix(),
    lastModifiedAt: dayjs().unix(),
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
    avatar: user.avatar || null,
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
    avatar: request.session.user.avatar,
  });
};

export const editUser = async (
  request: FastifyRequest<{
    Body: {
      avatar?: string | null;
      username?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = new ObjectId(request.session.user.id);
    const { avatar, username } = request.body;
    const userCollection = getUserCollection(request.server);

    if (!userId) {
      return reply
        .status(REQUEST_ERROR.unauthorized.code)
        .send(
          errorResponse(
            REQUEST_ERROR.unauthorized.message,
            REQUEST_ERROR.unauthorized.code
          )
        );
    }

    const userToBeUpdated = await userCollection.findOne({
      _id: userId,
    });

    if (!userToBeUpdated) {
      return reply
        .status(REQUEST_ERROR.notFound.code)
        .send(errorResponse('User not found', REQUEST_ERROR.notFound.code));
    }

    if (username && username !== userToBeUpdated.username) {
      const userTobeUpdated = await userCollection.findOne({ username });

      if (userTobeUpdated) {
        return reply
          .status(REQUEST_ERROR.badRequest.code)
          .send(
            errorResponse(
              'Username already exists',
              REQUEST_ERROR.badRequest.code
            )
          );
      }
    }

    const updatedFields: Partial<{
      avatar: string | null;
      username: string;
      lastModifiedAt: number;
    }> = {
      lastModifiedAt: dayjs().unix(),
    };

    if (avatar !== undefined) updatedFields.avatar = avatar;
    if (username !== undefined && username !== userToBeUpdated.username) {
      updatedFields.username = username;
    }

    const updatedProfile = await userCollection.updateOne(
      { _id: userId },
      { $set: updatedFields }
    );

    request.session.user = {
      ...request.session.user,
      ...(avatar !== undefined && { avatar }),
      ...(username !== undefined &&
        username !== userToBeUpdated.username && { username }),
    };

    return reply
      .status(200)
      .send(
        successResponse(
          'Success edit profile',
          200,
          updatedProfile.modifiedCount
        )
      );
  } catch (error) {
    console.error(error);
    return reply
      .status(REQUEST_ERROR.internalError.code)
      .send(errorResponse(undefined, REQUEST_ERROR.internalError.code));
  }
};

export const changePassword = async (
  request: FastifyRequest<{
    Body: {
      oldPassword: string;
      newPassword: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = new ObjectId(request.session.user.id);
    const userCollection = getUserCollection(request.server);
    const { oldPassword, newPassword } = request.body;

    if (!userId) {
      return reply
        .status(REQUEST_ERROR.unauthorized.code)
        .send(
          errorResponse(
            REQUEST_ERROR.unauthorized.message,
            REQUEST_ERROR.unauthorized.code
          )
        );
    }

    if (!oldPassword) {
      return reply
        .status(400)
        .send(errorResponse('Current password is required', 400));
    }

    if (!newPassword) {
      return reply
        .status(400)
        .send(errorResponse('New password is required', 400));
    }

    const userToBeUpdated = await userCollection.findOne({ _id: userId });

    if (!userToBeUpdated) {
      return reply
        .status(REQUEST_ERROR.notFound.code)
        .send(errorResponse('User not found', REQUEST_ERROR.notFound.code));
    }

    const isOldPasswordCorrect = await bcrypt.compare(
      oldPassword,
      userToBeUpdated.password
    );

    if (!isOldPasswordCorrect) {
      return reply.status(400).send(
        errorResponse('Old password is not correct', 400, {
          errorCode: 'invalid-old-password',
        })
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await userCollection.updateOne(
      { _id: userId },
      { $set: { password: hashedNewPassword, lastModifiedAt: dayjs().unix() } }
    );

    return reply
      .status(200)
      .send(successResponse('Password updated successfully', 200));
  } catch (error) {
    console.error('Failed to change password:', error);

    return reply.status(500).send(errorResponse('Internal Server Error', 500));
  }
};
