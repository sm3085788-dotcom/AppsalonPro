const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
const defaults = config.watchFolders ?? [];
config.watchFolders = [...new Set([...defaults, workspaceRoot])];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Evita que `eas update` (carpeta dist/) tumbe Metro en desarrollo.
const distBlock = new RegExp(
  `${path.resolve(projectRoot, 'dist').replace(/\\/g, '\\\\')}[/\\\\].*`,
);
config.resolver.blockList = [...(config.resolver.blockList ?? []), distBlock];

module.exports = config;
