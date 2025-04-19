import { FastifyInstance } from 'fastify';
import { ICreateNewTag } from '../types/tag.type';
import {
  createNewTag,
  // createSystemTag,
  deleteTagById,
  editTagById,
  getAllTags,
} from '../controllers/tag.controller';

export default async function tagRoutes(server: FastifyInstance) {
  // Create new tag
  server.post<{ Body: ICreateNewTag }>(
    '/api/v1/tag/create-new-tag',
    { preHandler: server.authenticate },
    createNewTag
  );

  // Get all tags
  server.get(
    '/api/v1/tag/get-all',
    { preHandler: server.authenticate },
    getAllTags
  );

  // Delete tag by id
  server.delete<{
    Params: {
      tagId: string;
    };
  }>(
    '/api/v1/tag/delete/:tagId',
    { preHandler: server.authenticate },
    deleteTagById
  );

  // Edit tag by id
  server.patch<{
    Body: {
      tagId: string;
      name?: string;
      color?: string;
    };
  }>('/api/v1/tag/edit', { preHandler: server.authenticate }, editTagById);

  // server.post('/api/v1/tag/create-new-tag-by-system', createSystemTag);
}
