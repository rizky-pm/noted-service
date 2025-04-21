const corsConfig = {
  origin:
    process.env.NODE_ENV === 'production'
      ? 'http://103.63.25.22:3000'
      : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
};

export default corsConfig;
