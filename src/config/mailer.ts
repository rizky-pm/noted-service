const mailerConfig = {
  defaults: {
    from: 'Rizky P. Mahendra',
  },
  transport: {
    service: 'Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'rizkymahendra2346@gmail.com',
      pass: 'fhey adpt wxji kfex',
    },
  },
};

export default mailerConfig;
