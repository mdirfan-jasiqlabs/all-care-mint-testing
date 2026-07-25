process.stdout.isTTY = true;
process.stdin.isTTY = true;
process.stderr.isTTY = true;

Object.defineProperty(process.stdout, 'isTTY', { value: true });
Object.defineProperty(process.stdin, 'isTTY', { value: true });
Object.defineProperty(process.stderr, 'isTTY', { value: true });
