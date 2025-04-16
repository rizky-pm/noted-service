import { FastifyReply, FastifyRequest } from 'fastify';
import { ICreateNewTag } from '../types/tag.type';
import getTagCollection from '../models/tag.model';
import { errorResponse, successResponse } from '../helpers/response.helper';
import { REQUEST_ERROR } from '../constant';
import _ from 'lodash';
import dayjs from 'dayjs';
import { ObjectId } from 'mongodb';
import { getNoteCollection } from '../models/note.model';

export const createNewTag = async (
  request: FastifyRequest<{ Body: ICreateNewTag }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.session.user.id;
    const { title, color } = request.body;
    const tagsCollection = getTagCollection(request.server);

    if (!title) {
      return reply.status(400).send({ error: 'Tag name is required' });
    }

    const existingTag = await tagsCollection.findOne({
      label: _.capitalize(title),
      createdBy: new ObjectId(userId),
    });

    if (existingTag) {
      return reply.status(409).send({ error: 'Tag already exists' });
    }

    const newTag = await tagsCollection.insertOne({
      label: _.capitalize(title),
      code: _.kebabCase(title),
      color,
      createdAt: dayjs().unix(),
      updatedAt: dayjs().unix(),
      createdBy: new ObjectId(userId),
    });

    return reply.status(201).send({
      message: 'Tag created successfully',
      tagId: newTag.insertedId,
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const deleteTagById = async (
  request: FastifyRequest<{ Params: { tagId: string } }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.session.user.id;
    const { tagId } = request.params;
    const tagsCollection = getTagCollection(request.server);

    const tag = await tagsCollection.findOne({ _id: new ObjectId(tagId) });

    if (!tag) {
      return reply.status(404).send(errorResponse('Tag not founds', 404));
    }

    if (tag.createdBy.toString() === userId) {
      await tagsCollection.deleteOne({ _id: new ObjectId(tagId) });
    } else {
      return reply
        .status(403)
        .send(errorResponse('You are not authorized to delete this tag', 403));
    }

    return reply
      .status(200)
      .send(successResponse('Tag deleted successfully', 200));
  } catch (error) {
    console.error(error);
    return reply.status(500).send(errorResponse());
  }
};

export const getAllTags = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userId = new ObjectId(request.session.user.id);
    const tagsCollection = getTagCollection(request.server);

    const tags = await tagsCollection
      .find({
        $or: [{ createdBy: userId }, { createdBy: null }],
      })
      .toArray();

    const formattedTags = tags.map((tag) => ({
      ...tag,
      deletable: tag.createdBy !== null ? true : false,
    }));

    return reply
      .status(200)
      .send(successResponse('Tags retrieved', 200, formattedTags));
  } catch (error) {
    console.error(error);
    return reply.status(REQUEST_ERROR.internalError.code).send(errorResponse());
  }
};

export const createSystemTag = async (
  request: FastifyRequest<{ Body: { title: string; color: string } }>,
  reply: FastifyReply
) => {
  try {
    const { title, color } = request.body;
    const tagsCollection = getTagCollection(request.server);

    if (!title) {
      return reply.status(400).send({ error: 'Tag name is required' });
    }

    const existingTag = await tagsCollection.findOne({
      label: _.capitalize(title),
      createdBy: null,
    });

    if (existingTag) {
      return reply.status(409).send({ error: 'System tag already exists' });
    }

    const newTag = await tagsCollection.insertOne({
      label: _.capitalize(title),
      code: _.kebabCase(title),
      color,
      createdAt: dayjs().unix(),
      updatedAt: dayjs().unix(),
      createdBy: null,
    });

    return reply.status(201).send({
      message: 'System tag created successfully',
      tagId: newTag.insertedId,
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};
