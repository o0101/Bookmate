import fs from 'fs';
import {
  renameSync,
  getProfileRootDir,
  mkdirSync,
  existsSync, readdirSync, 
  readFileSync, promisesWatch,
  writeFileSync,
  unlinkSync
} from './index.js';

const TEST_OPTS = {
  // Note 
    // these next two options keep 
    // observer open for test and 
    // make thread wait for observer to exit first
  persistent: true,
  unref: false,
}

test();

export async function test() {
  watchChanges();
  const {guid,id} = readFileSync(
    ['bookmark_bar', 'b', 'https://abc.xyz/'],
    {encoding:'json'}
  )
  writeFileSync(
    ['bookmark_bar', 'b', 'https://abc.xyz/'],
    { name: '', url: '', id, guid}
  );
}

async function watchChanges() {
  const observer = promisesWatch(TEST_OPTS);
  for await ( const change of observer ) {
    console.log(change);
  }
}

