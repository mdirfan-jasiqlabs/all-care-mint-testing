const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Resolve packages in project node_modules then root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Add mjs and cjs to sourceExts for packages like lucide-react-native
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// 4. Exclude frontend build artifacts from Metro file watcher
config.resolver.blockList = [
  /.*\/apps\/frontend\/\.next\/.*/,
  /.*\/dist\/.*/,
];

module.exports = config;
