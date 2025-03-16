import { ObjectId } from 'mongodb';

export interface INote {
  _id?: string;
  title: string;
  tag: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
}

export interface IGetAllNotes {
  queryString: {
    page?: string;
    limit?: string;
    sort?: 'ASC' | 'DESC';
  };
}

export interface ICreateNewNote {
  title: string;
  tag: {
    id: string;
    code: string;
    label: string;
  };
  content: string;
}

export interface IGetNewNoteById {
  noteId: string;
}

export interface IUpdateNoteById {
  params: {
    noteId: string;
  };
  body: {
    title?: string;
    content?: string;
    tag?: string;
  };
}

export interface IDeleteNoteById {
  noteId: string;
}
