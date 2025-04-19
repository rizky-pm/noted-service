export interface ITag {
  _id?: string;
  label: string;
  code: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface ICreateNewTag {
  name: string;
  color: 'red' | 'yellow' | 'green' | 'blue';
}
