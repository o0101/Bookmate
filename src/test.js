import {bookmarkChanges} from './index.js';

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
  for await ( const change of bookmarkChanges(TEST_OPTS) ) {
    console.log(change);
  }
}

