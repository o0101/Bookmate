import Path from 'path';
import chokidar from 'chokidar';
import {getProfileRootDir} from './index.js';

const CHOK_OPTS = {
  persistent: true
};
start();
async function start() {
  const glob = Path.resolve(getProfileRootDir(), '**', '*');
  const changes = chokidar.watch(glob, CHOK_OPTS);
  changes.on('all', (event, path) => {
    console.log(event, path);
  });
}


