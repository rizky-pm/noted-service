import { BaseResponse } from '../types/response.type';

export const successResponse = <T = null>(
  message?: string,
  code?: number,
  data?: T
): BaseResponse<T> => ({
  status: 'success',
  message: message ?? 'Request successful', // Default if not provided
  code: code ?? 200, // Default if not provided
  ...(data !== undefined ? { data } : {}), // Only include `data` if not `undefined`
});

export const errorResponse = <T = null>(
  message?: string,
  code?: number,
  data?: T
): BaseResponse<T> => ({
  status: 'error',
  message: message ?? 'Oops, something went wrong.',
  code: code ?? 500,
  ...(data !== undefined ? { data } : {}),
});
