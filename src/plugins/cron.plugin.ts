import fp from 'fastify-plugin';
import { CronJob } from 'cron';
import dayjs from 'dayjs';

export default fp(async (fastify) => {
  // Once a day, at midnight
  const job = new CronJob('0 0 * * *', async () => {
    if (!fastify.mongo.db) return;

    fastify.log.info('[Cron] Checking for expired reset tokens...');

    try {
      const userCollection = fastify.mongo.db.collection('users');

      const expiredTokens = await userCollection.updateMany(
        {
          resetPasswordExpires: { $lt: dayjs().unix() },
          resetPasswordToken: { $exists: true },
        },
        {
          $unset: {
            resetPasswordToken: '',
            resetPasswordExpires: '',
          },
        }
      );

      fastify.log.info(
        `[Cron] Removed expired tokens for ${expiredTokens.modifiedCount} user(s).`
      );
    } catch (error) {
      fastify.log.error('[Cron] Error during expired token cleanup:', error);
    }
  });

  job.start();
  fastify.log.info('Cron job to clean up expired reset tokens started.');
});
