import bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import fastify, { FastifyRequest, FastifyReply } from 'fastify';

import { getUserCollection } from '../models/user.model';
import { UserCredentials } from '../types/user.type';
import { errorResponse, successResponse } from '../helpers/response.helper';
import { REQUEST_ERROR } from '../constant';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

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

export const sendResetPasswordEmail = async (
  request: FastifyRequest<{
    Body: {
      email: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userCollection = getUserCollection(request.server);
    const email = request.body.email;

    const user = await userCollection.findOne({ email });

    if (!user) {
      return reply
        .status(400)
        .send(errorResponse('Email is not registered', 400));
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = dayjs().add(1, 'hour').unix();
    await userCollection.updateOne(
      { email },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: expires,
        },
      }
    );
    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'https://your-production-domain.com';

    const resetLink = `${baseUrl}/auth/forget-password/reset?token=${token}&email=${encodeURIComponent(
      email
    )}`;

    await request.mailer.sendMail({
      to: email,
      subject: 'Reset Your Password',
      html: `
        <p>Hello,</p>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn’t request a password reset, you can safely ignore this email.</p>
      `,
    });

    return reply
      .status(200)
      .send(successResponse('Reset email sent successfully', 200));
  } catch (error) {
    console.error('Reset password email error:', error);
    return reply
      .status(500)
      .send(errorResponse('Failed to send reset email', 500, error));
  }
};

export const validateResetPasswordSession = async (
  request: FastifyRequest<{
    Querystring: {
      email: string;
      token: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userCollection = getUserCollection(request.server);
    const { email, token } = request.query;

    if (!email || !token) {
      return reply
        .status(400)
        .send(errorResponse('Email and reset password token is required', 400));
    }

    const user = await userCollection.findOne({ email });

    if (!user) {
      return reply.status(404).send(errorResponse('User is not found', 404));
    }

    if (
      user.resetPasswordToken !== token ||
      user.resetPasswordExpires < dayjs().unix()
    ) {
      await userCollection.updateOne(
        { email },
        {
          $unset: { resetPasswordToken: '', resetPasswordExpires: '' },
        }
      );

      return reply.status(400).send(errorResponse('Invalid session', 404));
    }

    return reply.status(200).send(successResponse(undefined, 200));
  } catch (error) {
    return reply.status(500).send(errorResponse('Internal Server Error', 500));
  }
};

export const resetPassword = async (
  request: FastifyRequest<{
    Body: {
      newPassword: string;
      token: string;
      email: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { email, newPassword, token } = request.body;

    if (!email || !token) {
      return reply
        .status(400)
        .send(errorResponse('Email and reset password token is required', 400));
    }

    if (!newPassword) {
      return reply
        .status(400)
        .send(errorResponse('New password is required', 400));
    }

    const userCollection = getUserCollection(request.server);
    const user = await userCollection.findOne({ email });

    if (!user) {
      return reply.status(404).send(errorResponse('User is not found', 404));
    }

    const currentTime = dayjs().unix();
    const isTokenMismatch = user.resetPasswordToken !== token;
    const isExpired = user.resetPasswordExpires < currentTime;

    if (isTokenMismatch || isExpired) {
      await userCollection.updateOne(
        { email },
        {
          $unset: {
            resetPasswordToken: '',
            resetPasswordExpires: '',
          },
        }
      );
      return reply.status(400).send(errorResponse('Invalid session', 400));
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await userCollection.updateOne(
      { email },
      {
        $set: {
          password: hashedNewPassword,
          lastModifiedAt: currentTime,
        },
        $unset: {
          resetPasswordToken: '',
          resetPasswordExpires: '',
        },
      }
    );

    return reply
      .status(200)
      .send(
        successResponse(
          "Password updated successfully, you'll be redirected to sign in page in a second",
          200
        )
      );
  } catch (error) {
    console.error('Failed to change password:', error);
    return reply.status(500).send(errorResponse('Internal Server Error', 500));
  }
};
