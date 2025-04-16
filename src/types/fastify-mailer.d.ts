declare module 'fastify-mailer' {
  import { Transporter } from 'nodemailer';

  export interface FastifyMailerNamedInstance {
    [namespace: string]: Transporter;
  }
  export type FastifyMailer = FastifyMailerNamedInstance & Transporter;

  const fastifyMailer: FastifyPluginCallback<FastifyMailerOptions>;

  export default fastifyMailer;
}
