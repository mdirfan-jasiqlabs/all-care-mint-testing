const { RedisMemoryServer } = require('redis-memory-server');

async function start() {
  try {
    const redisServer = await RedisMemoryServer.create({
      instance: {
        port: 6379,
      },
    });
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();
    console.log(`✅ Redis Memory Server is running at ${host}:${port}`);
  } catch (err) {
    console.error('Failed to start Redis Memory Server:', err);
  }
}

start();
