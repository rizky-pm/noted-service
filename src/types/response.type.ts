export interface BaseResponse<T> {
  status: 'success' | 'error';
  message: string;
  code?: number;
  data: T;
}
