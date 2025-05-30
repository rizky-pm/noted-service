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
import { WebSocket } from '@fastify/websocket';

const wsClients = new Set<WebSocket>();

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

    const noteCount = await notesCollection.countDocuments({
      ownerId: new ObjectId(userId),
    });

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
        order: noteCount,
        lastMovedAt: dayjs().unix(),
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
      tag?: string[];
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
              { $project: { id: '$_id', label: 1, code: 1, _id: 0, color: 1 } },
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
    const tagCollection = getTagCollection(request.server);

    const existingNote = await notesCollection.findOne({
      _id: new ObjectId(noteId),
      ownerId: new ObjectId(userId),
    });

    let newTag;

    if (tag) {
      newTag = await tagCollection.findOne({ code: tag });
    }

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
      tagId: ObjectId;
      updatedAt: number;
    }> = {
      updatedAt: dayjs().unix(),
    };
    if (title) updatedFields.title = title;
    if (content) updatedFields.content = content;
    if (newTag) updatedFields.tagId = new ObjectId(newTag._id);

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
  socket: WebSocket,
  request: FastifyRequest
) => {
  wsClients.add(socket);

  socket.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'UPDATE_NOTE_POSITION') {
        const { noteId, x, y, order } = data.payload;

        const notesCollection = getNoteCollection(request.server);
        const lastMovedAt = dayjs().unix();

        if (typeof order === 'number') {
          const movedNote = await notesCollection.findOne({
            _id: new ObjectId(noteId),
          });

          if (!movedNote) return;

          const oldOrder = movedNote.position.order;

          // Update the moved note
          await notesCollection.updateOne(
            { _id: new ObjectId(noteId) },
            { $set: { 'position.order': order } }
          );

          if (order > oldOrder) {
            // Moved down → decrement others between old+1 and new
            await notesCollection.updateMany(
              {
                'position.order': { $gt: oldOrder, $lte: order },
                _id: { $ne: new ObjectId(noteId) },
              },
              { $inc: { 'position.order': -1 } }
            );
          } else if (order < oldOrder) {
            // Moved up → increment others between new and old-1
            await notesCollection.updateMany(
              {
                'position.order': { $gte: order, $lt: oldOrder },
                _id: { $ne: new ObjectId(noteId) },
              },
              { $inc: { 'position.order': 1 } }
            );
          }

          const broadcastData = JSON.stringify({
            type: 'UPDATE_NOTE_POSITION',
            payload: { noteId, order, oldOrder },
          });

          for (const client of wsClients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          }
        } else {
          await notesCollection.updateOne(
            { _id: new ObjectId(noteId) },
            {
              $set: {
                'position.x': x,
                'position.y': y,
                'position.lastMovedAt': lastMovedAt,
              },
            }
          );

          const broadcastData = JSON.stringify({
            type: 'UPDATE_NOTE_POSITION',
            payload: {
              noteId,
              x,
              y,
              lastMovedAt,
            },
          });

          for (const client of wsClients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Invalid websocket message or DB error:', error);
    }
  });

  socket.on('close', () => {
    wsClients.delete(socket);
  });
};

export const wsTestHandler = (socket: WebSocket, _req: FastifyRequest) => {
  socket.on('message', (message) => {
    console.log('📨 Message received from client:', message.toString());
    socket.send('hi from server');
  });

  socket.on('close', () => {
    console.log('🔌 Client disconnected');
  });
};
