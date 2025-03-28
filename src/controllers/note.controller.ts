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
import getTagCollection from '../models/tag.model';

export const createNewNote = async (
  request: FastifyRequest<{
    Body: ICreateNewNote;
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.session.user.id;
    const { title, content, tag, position } = request.body;
    const notesCollection = getNoteCollection(request.server);
    const tagsCollection = getTagCollection(request.server);

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
          `${REQUEST_ERROR.badRequest.message}, title, content, and tag are required`,
          REQUEST_ERROR.badRequest.code
        )
      );
    }

    const tagData = await tagsCollection.findOne({ code: tag });

    if (!tagData) {
      return reply.send(
        errorResponse(
          `Tag with code '${tag}' not found`,
          REQUEST_ERROR.badRequest.code
        )
      );
    }

    const newNote = await notesCollection.insertOne({
      title,
      content,
      tagId: new ObjectId(tagData._id),
      ownerId: new ObjectId(userId),
      createdAt: dayjs().unix(),
      updatedAt: dayjs().unix(),
      position: {
        x: position.x,
        y: position.y,
      },
    });

    return reply.send(
      successResponse('Note created successfully', 201, newNote)
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

export const getAllNotes = async (
  request: FastifyRequest<{
    Body: {
      page?: string;
      limit?: string;
      sort?: 'ASC' | 'DESC';
      title?: string;
      tag?: string[]; // Array of tag IDs to filter by
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.session.user.id;
    let sortAscending = request.body.sort === 'DESC' ? -1 : 1;

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

    const notesCollection = getNoteCollection(request.server);

    const page = parseInt(request.body.page ?? '1', 10);
    const limit = parseInt(request.body.limit ?? '10', 10);
    const skip = (page - 1) * limit;

    const matchFilter: Record<string, any> = { ownerId: new ObjectId(userId) };

    if (request.body.title) {
      matchFilter.title = { $regex: new RegExp(request.body.title, 'i') };
    }

    if (request.body.tag && request.body.tag.length > 0) {
      matchFilter.tagId = {
        $in: request.body.tag.map((id) => new ObjectId(id)),
      };
    }

    const notes = await notesCollection
      .aggregate([
        { $match: matchFilter },
        { $sort: { createdAt: sortAscending } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'tags',
            let: { tagId: { $toObjectId: '$tagId' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$tagId'] } } },
              { $project: { id: '$_id', label: 1, code: 1, _id: 0 } },
            ],
            as: 'tag',
          },
        },
        { $unwind: { path: '$tag', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    const totalNotes = await notesCollection.countDocuments(matchFilter);

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
    return reply.status(500).send(errorResponse(undefined, 500, error));
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
    const userId = request.session.user.id;
    const { noteId } = request.params;
    const { title, content, tag } = request.body;

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

    if (!noteId) {
      return reply
        .status(REQUEST_ERROR.badRequest.code)
        .send(
          errorResponse(
            `${REQUEST_ERROR.badRequest.message}, noteId is required`,
            REQUEST_ERROR.badRequest.code
          )
        );
    }

    if (!title && !content && !tag) {
      return reply
        .status(REQUEST_ERROR.badRequest.code)
        .send(
          errorResponse(
            `${REQUEST_ERROR.badRequest.message}, at least one field (title or content or tag) is required`,
            REQUEST_ERROR.badRequest.code
          )
        );
    }

    const notesCollection = getNoteCollection(request.server);
    const existingNote = await notesCollection.findOne({
      _id: new ObjectId(noteId),
      ownerId: new ObjectId(userId),
    });

    if (!existingNote) {
      return reply
        .status(REQUEST_ERROR.notFound.code)
        .send(
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
      { _id: new ObjectId(noteId), ownerId: new ObjectId(userId) },
      { $set: updatedFields }
    );

    return reply
      .status(200)
      .send(successResponse(undefined, undefined, updatedNote.modifiedCount));
  } catch (error) {
    console.error(error);
    return reply
      .status(REQUEST_ERROR.internalError.code)
      .send(errorResponse(undefined, 500, error));
  }
};

export const deleteNoteById = async (
  request: FastifyRequest<{
    Params: IDeleteNoteById;
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.session.user.id;
    const { noteId } = request.params;

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

    if (!noteId) {
      return reply
        .status(REQUEST_ERROR.badRequest.code)
        .send(
          errorResponse(
            `${REQUEST_ERROR.badRequest.message}, note id is required`,
            REQUEST_ERROR.badRequest.code
          )
        );
    }

    const notesCollection = getNoteCollection(request.server);

    const note = await notesCollection.findOne({
      _id: new ObjectId(noteId),
      ownerId: new ObjectId(userId),
    });

    if (!note) {
      return reply
        .status(REQUEST_ERROR.notFound.code)
        .send(
          errorResponse(
            REQUEST_ERROR.notFound.message,
            REQUEST_ERROR.notFound.code
          )
        );
    }

    await notesCollection.deleteOne({
      _id: new ObjectId(noteId),
      ownerId: new ObjectId(userId),
    });

    return reply.status(200).send(
      successResponse(`Note '${note.title}' successfully deleted`, undefined, {
        noteId,
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

export const updateNotePosition = async (
  request: FastifyRequest<{
    Params: { noteId: string };
    Body: { x: number; y: number };
  }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.session.user.id;
    const { noteId } = request.params;
    const { x, y } = request.body;

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

    if (!noteId || x === undefined || y === undefined) {
      return reply
        .status(REQUEST_ERROR.badRequest.code)
        .send(
          errorResponse(
            `${REQUEST_ERROR.badRequest.message}, noteId, x, and y are required`,
            REQUEST_ERROR.badRequest.code
          )
        );
    }

    const notesCollection = getNoteCollection(request.server);

    const existingNote = await notesCollection.findOne({
      _id: new ObjectId(noteId),
      ownerId: new ObjectId(userId),
    });

    if (!existingNote) {
      return reply
        .status(REQUEST_ERROR.notFound.code)
        .send(
          errorResponse(
            REQUEST_ERROR.notFound.message,
            REQUEST_ERROR.notFound.code
          )
        );
    }

    const updateResult = await notesCollection.updateOne(
      { _id: new ObjectId(noteId), ownerId: new ObjectId(userId) },
      { $set: { position: { x, y }, updatedAt: dayjs().unix() } }
    );

    if (updateResult.modifiedCount === 0) {
      return reply
        .status(500)
        .send(
          errorResponse(
            'Failed to update note position',
            REQUEST_ERROR.internalError.code
          )
        );
    }

    return reply.status(200).send(
      successResponse('Note position updated successfully', 200, {
        noteId,
        x,
        y,
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
