process.stdout.isTTY = true;
process.stdin.isTTY = true;
process.stderr.isTTY = true;

Object.defineProperty(process.stdout, 'isTTY', { value: true });
Object.defineProperty(process.stdin, 'isTTY', { value: true });
Object.defineProperty(process.stderr, 'isTTY', { value: true });

const path = require('path');
const prismaPath = path.resolve(__dirname, './node_modules/prisma/build/index.js');
require.main.filename = prismaPath;
require.main.id = prismaPath;

require(prismaPath);
