import { FastifyReply, FastifyRequest } from 'fastify';
import { errorResponse, successResponse } from '../helpers/response.helper';
import { getNoteCollection } from '../models/note.model';
import { REQUEST_ERROR } from '../constant';
import dayjs from 'dayjs';
import {
  ICreateNewNote,
  IDeleteNoteById,
  IGetNewNoteById,
  IUpdateNoteById,
} from '../types/note.type';
import { ObjectId } from 'mongodb';

export const createNewNote = async (
  request: FastifyRequest<{
    Body: ICreateNewNote;
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.user.userId;
    const { title, content, tag } = request.body;
    const notesCollection = getNoteCollection(request.server);

    if (!userId) {
      return reply.send(
        errorResponse(
          REQUEST_ERROR.unauthorized.message,
          REQUEST_ERROR.unauthorized.code
        )
      );
    }

    if (!title || !content || !tag) {
      return reply.send(
        errorResponse(
          `${REQUEST_ERROR.badRequest.message}, title, content and tag is required`,
          REQUEST_ERROR.badRequest.code
        )
      );
    }

    const newNote = await notesCollection.insertOne({
      title,
      content,
      tag,
      ownerId: userId,
      createdAt: dayjs().unix(),
      updatedAt: dayjs().unix(),
    });

    return reply.send(
      successResponse('Note created successfully', 201, newNote)
    );
  } catch (error) {
    console.error(error);
    return reply.send(
      errorResponse(
        REQUEST_ERROR.internalError.message,
        REQUEST_ERROR.internalError.code
      )
    );
  }
};

export const getAllNotes = async (
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.user.userId;

    if (!userId) {
      return reply.send(
        errorResponse(
          REQUEST_ERROR.unauthorized.message,
          REQUEST_ERROR.unauthorized.code
        )
      );
    }

    const notesCollection = getNoteCollection(request.server);

    const page = parseInt(request.query.page ?? '1', 10);
    const limit = parseInt(request.query.limit ?? '10', 10);
    const skip = (page - 1) * limit;

    const notes = await notesCollection
      .find({ ownerId: userId })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalNotes = await notesCollection.countDocuments({
      ownerId: userId,
    });

    return reply.send(
      successResponse(undefined, undefined, {
        page,
        limit,
        totalPages: Math.ceil(totalNotes / limit),
        totalNotes,
        notes,
      })
    );
  } catch (error) {
    return reply.send(errorResponse(undefined, 500, error));
  }
};

export const getNoteById = async (
  request: FastifyRequest<{
    Params: IGetNewNoteById;
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.user.userId;
    const notesCollection = getNoteCollection(request.server);
    const { noteId } = request.params;

    if (!userId) {
      return reply.send(
        errorResponse(
          REQUEST_ERROR.unauthorized.message,
          REQUEST_ERROR.unauthorized.code
        )
      );
    }

    if (!noteId) {
      return reply.send(
        errorResponse(
          `${REQUEST_ERROR.badRequest.message}, note id is required`,
          REQUEST_ERROR.badRequest.code
        )
      );
    }

    const note = await notesCollection.findOne({
      _id: new ObjectId(noteId),
      ownerId: userId,
    });

    if (!note) {
      return reply.send(
        errorResponse(
          REQUEST_ERROR.notFound.message,
          REQUEST_ERROR.notFound.code
        )
      );
    }

    return reply.send(successResponse(undefined, undefined, note));
  } catch (error) {
    console.error(error);
    return reply.send(
      errorResponse(
        REQUEST_ERROR.internalError.message,
        REQUEST_ERROR.internalError.code
      )
    );
  }
};

export const updateNoteById = async (
  request: FastifyRequest<{
    Params: IUpdateNoteById['params'];
    Body: IUpdateNoteById['body'];
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.user.userId;
    const { noteId } = request.params;
    const { title, content, tag } = request.body;

    if (!userId) {
      return reply.send(
        errorResponse(
          REQUEST_ERROR.unauthorized.message,
          REQUEST_ERROR.unauthorized.code
        )
      );
    }

    if (!noteId) {
      return reply.send(
        errorResponse(
          `${REQUEST_ERROR.badRequest.message}, noteId is required`,
          REQUEST_ERROR.badRequest.code
        )
      );
    }

    if (!title && !content && !tag) {
      return reply.send(
        errorResponse(
          `${REQUEST_ERROR.badRequest.message}, at least one field (title or content or tag) is required`,
          REQUEST_ERROR.badRequest.code
        )
      );
    }

    const notesCollection = getNoteCollection(request.server);
    const existingNote = notesCollection.findOne({
      _id: new ObjectId(noteId),
      ownerId: userId,
    });

    if (!existingNote) {
      return reply.send(
        errorResponse(
          REQUEST_ERROR.notFound.message,
          REQUEST_ERROR.notFound.code
        )
      );
    }

    const updatedFields: Partial<{
      title: string;
      content: string;
      updatedAt: number;
    }> = {
      updatedAt: dayjs().unix(),
    };
    if (title) updatedFields.title = title;
    if (content) updatedFields.content = content;

    const updatedNote = await notesCollection.updateOne(
      { _id: new ObjectId(noteId), ownerId: userId },
      { $set: updatedFields }
    );

    return reply.send(
      successResponse(undefined, undefined, updatedNote.modifiedCount)
    );
  } catch (error) {
    console.error(error);
    return reply.send(errorResponse(undefined, 500, error));
  }
};

export const deleteNoteById = async (
  request: FastifyRequest<{
    Params: IDeleteNoteById;
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.user.userId;
    const { noteId } = request.params;

    if (!userId) {
      return reply.send(
        errorResponse(
          REQUEST_ERROR.unauthorized.message,
          REQUEST_ERROR.unauthorized.code
        )
      );
    }

    if (!noteId) {
      return reply.send(
        errorResponse(
          `${REQUEST_ERROR.badRequest.message}, note id is required`,
          REQUEST_ERROR.badRequest.code
        )
      );
    }

    const notesCollection = getNoteCollection(request.server);
    const deleteResult = await notesCollection.deleteOne({
      _id: new ObjectId(noteId),
      ownerId: userId,
    });

    if (deleteResult.deletedCount === 0) {
      return reply.send(
        errorResponse(
          REQUEST_ERROR.notFound.message,
          REQUEST_ERROR.notFound.code
        )
      );
    }

    return reply.send(
      successResponse(
        `Note with id ${noteId} successfully deleted`,
        undefined,
        { noteId }
      )
    );
  } catch (error) {
    console.error(error);

    return reply.send(
      errorResponse(
        REQUEST_ERROR.internalError.message,
        REQUEST_ERROR.internalError.code
      )
    );
  }
};
