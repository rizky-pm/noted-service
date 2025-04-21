const corsConfig = {
  origin:
    process.env.NODE_ENV === 'production'
      ? 'http://103.63.25.22:5173'
      : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
};

export default corsConfig;
