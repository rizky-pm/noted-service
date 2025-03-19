import { FastifyInstance } from 'fastify';
import {
  createNewNote,
  deleteNoteById,
  getAllNotes,
  getNoteById,
  updateNoteById,
} from '../controllers/note.controller';
import {
  ICreateNewNote,
  IDeleteNoteById,
  IGetAllNotes,
  IGetNewNoteById,
  IUpdateNoteById,
} from '../types/note.type';

export default async function noteRoutes(server: FastifyInstance) {
  // Get all notes
  server.get<{
    Querystring: IGetAllNotes['QueryString'];
  }>('/api/v1/notes', { preHandler: server.authenticate }, getAllNotes);

  // Get note by id
  server.get<{ Params: IGetNewNoteById }>(
    '/api/v1/notes/:noteId',
    { preHandler: server.authenticate },
    getNoteById
  );

  // Create new note
  server.post<{
    Body: ICreateNewNote;
  }>(
    '/api/v1/notes/create-new-note',
    { preHandler: server.authenticate },
    createNewNote
  );

  // Update note by id
  server.put<{
    Params: IUpdateNoteById['params'];
    Body: IUpdateNoteById['body'];
  }>(
    '/api/v1/notes/:noteId',
    { preHandler: server.authenticate },
    updateNoteById
  );

  // Delete note by id
  server.delete<{ Params: IDeleteNoteById }>(
    '/api/v1/notes/:noteId',
    { preHandler: server.authenticate },
    deleteNoteById
  );
}
