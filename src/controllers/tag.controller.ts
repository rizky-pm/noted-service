import { FastifyReply, FastifyRequest } from 'fastify';
import { ICreateNewTag } from '../types/tag.type';
import getTagCollection from '../models/tag.model';
import { errorResponse, successResponse } from '../helpers/response.helper';
import { REQUEST_ERROR } from '../constant';
import _ from 'lodash';
import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';

export const createNewTag = async (
  request: FastifyRequest<{
    Body: ICreateNewTag;
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.session.user.id;
    const { value } = request.body;
    const tagsCollection = getTagCollection(request.server);

    if (!value) {
      return reply
        .status(REQUEST_ERROR.badRequest.code)
        .send(
          errorResponse(
            `${REQUEST_ERROR.badRequest.message}, tag name is required`,
            REQUEST_ERROR.badRequest.code
          )
        );
    }

    const newTag = await tagsCollection.insertOne({
      label: _.capitalize(value),
      code: _.kebabCase(value),
      createdAt: dayjs().unix(),
      updatedAt: dayjs().unix(),
      createdBy: userId,
    });

    return reply
      .status(201)
      .send(successResponse('Tag created successfully', 201, newTag));
  } catch (error) {
    console.error(error);
    return reply.status(REQUEST_ERROR.internalError.code).send(errorResponse());
  }
};

export const deleteTagById = async (
  request: FastifyRequest<{
    Params: {
      tagId: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.session.user.id;
    const { tagId } = request.params;
    const tagsCollection = getTagCollection(request.server);

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

    if (!tagId) {
      return reply
        .status(REQUEST_ERROR.badRequest.code)
        .send(
          errorResponse(
            `${REQUEST_ERROR.badRequest.message}, tag id is required`,
            REQUEST_ERROR.badRequest.code
          )
        );
    }

    const tag = await tagsCollection.findOne({
      _id: new ObjectId(tagId),
      createdBy: userId,
    });

    if (!tag) {
      return reply
        .status(REQUEST_ERROR.notFound.code)
        .send(
          errorResponse(
            REQUEST_ERROR.notFound.message,
            REQUEST_ERROR.notFound.code
          )
        );
    }

    await tagsCollection.deleteOne({
      _id: new ObjectId(tagId),
      createdBy: userId,
    });

    return reply.send(
      successResponse(`Tag '${tag.label}' successfully deleted`, undefined, {
        tagId,
      })
    );
  } catch (error) {
    console.error(error);

    return reply
      .status(REQUEST_ERROR.internalError.code)
      .send(
        errorResponse(
          REQUEST_ERROR.internalError.message,
          REQUEST_ERROR.internalError.code
        )
      );
  }
};

export const getAllTags = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.session.user.id;

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

    const tagsCollection = getTagCollection(request.server);
    const tags = await tagsCollection
      .find({
        createdBy: { $in: ['SYSTEM', userId] },
      })
      .toArray();

    return reply.status(200).send(successResponse(undefined, undefined, tags));
  } catch (error) {
    console.error();
    return reply.status(REQUEST_ERROR.internalError.code).send(errorResponse());
  }
};
