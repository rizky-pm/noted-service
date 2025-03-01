export interface IUser {
  _id?: string;
  username: string;
  email: string;
  password: string;
  createdAt: number;
  lastModifiedAt?: number;
}

export type UserCredentials = Pick<IUser, 'username' | 'email' | 'password'>;
