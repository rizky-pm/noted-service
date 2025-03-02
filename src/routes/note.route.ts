import { FastifyInstance } from 'fastify';
import {
  createNewNote,
  getAllNotes,
  getNoteById,
} from '../controllers/note.controller';
import { ICreateNewNote, IGetNewNoteById } from '../types/note.type';

export default async function noteRoutes(server: FastifyInstance) {
  server.get('/api/v1/notes', { preHandler: server.authenticate }, getAllNotes);
  server.get<{ Params: IGetNewNoteById }>(
    '/api/v1/notes/:noteId',
    { preHandler: server.authenticate },
    getNoteById
  );
  server.post<{
    Body: ICreateNewNote;
  }>(
    '/api/v1/notes/create-new-note',
    { preHandler: server.authenticate },
    createNewNote
  );
}
