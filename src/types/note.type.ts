export interface INote {
  _id?: string;
  title: string;
  tag: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
}

export interface ICreateNewNote {
  title: string;
  tag: string;
  content: string;
}

export interface IGetNewNoteById {
  noteId: string;
}
