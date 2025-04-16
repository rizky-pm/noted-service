const sessionConfig = {
  secret: 'supersecretkey',
  cookie: {
    secure: 'development',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  },
  saveUninitialized: false,
  rolling: true,
};

export default sessionConfig;
