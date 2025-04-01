export interface IJwtUser {
  userId: string;
  iat: number;
  exp: number;
}

export interface IUser {
  _id?: string;
  username: string;
  email: string;
  password: string;
  createdAt: number;
  avatar: string | null;
  lastModifiedAt?: number;
}

export type UserCredentials = Pick<IUser, 'username' | 'email' | 'password'>;
