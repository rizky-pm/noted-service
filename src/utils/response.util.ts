import { BaseResponse } from './../types/response.type';

export const successResponse = <T>(
  data: T,
  message: 'Request successfull',
  code = 200
): BaseResponse<T> => ({
  status: 'success',
  message,
  code,
  data,
});

export const errorResponse = <T>(
  data: T,
  message: 'Oops, something went wrong.',
  code = 400
): BaseResponse<T> => ({
  status: 'error',
  message,
  code,
  data,
});
