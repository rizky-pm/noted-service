import { FastifyRequest, FastifyReply } from 'fastify';
import { errorResponse } from '../helpers/response.helper';
import { REQUEST_ERROR } from '../constant';

export const authorization = async function (
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { user } = request.session;
  if (!user) {
    return reply
      .status(401)
      .send(
        errorResponse(
          REQUEST_ERROR.unauthorized.message,
          REQUEST_ERROR.unauthorized.code
        )
      );
  }
};
