import { RedisMemoryServer } from 'redis-memory-server';

async function main() {
  try {
    const redisServer = await RedisMemoryServer.create({
      instance: {
        port: 6379,
      },
    });
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();
    console.log(`✅ Redis Memory Server is running at ${host}:${port}`);
    // Keep process alive indefinitely
    setInterval(() => {}, 100000);
  } catch (err) {
    console.error('Failed to start Redis Memory Server:', err);
    process.exit(1);
  }
}

main();
