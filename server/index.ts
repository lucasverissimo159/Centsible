import { createApp } from './app.js';
import { createPrismaClient, PrismaRepository } from './prismaRepository.js';

const port = Number(process.env.PORT ?? 3001);
const prisma = createPrismaClient();
const app = await createApp(new PrismaRepository(prisma));

try {
  await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' });
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
