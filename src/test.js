import {
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
  const val = readdirSync(['bookmark_bar'], {withFileTypes:true});
  console.log(val);
  const val2 = readFileSync('https://www.clearme.com/enroll').toString();
  console.log(val2);
  const val3 = readdirSync(['bookmark_bar', 'fun']);
  console.log(val3);
  try {
    const val4 = readFileSync(['bookmark_bar', 'fun', 'https://musclewiki.com/']).toString();
    console.log(val4);
  } catch(e) {
    console.warn(e);
  }
  try {
    const val5 = unlinkSync('https://musclewiki.com/');
    console.log(val5);
  } catch(e) {
    console.warn(e);
  }
  /*
  const val6 = unlinkSync(['bookmark_bar', 'fun', 'https://musclewiki.com/'])
  console.log(val6);
  const val7 = writeFileSync(['bookmark_bar', 'fun', 'https://musclewiki.com/'], {
    type: 'url',
    name: 'MuscleWiki -- BIG TITS AND BIG BITS AND BICEPS!'
  });
  console.log(val7);
  */
}

async function watchChanges() {
  const observer = promisesWatch(TEST_OPTS);
  for await ( const change of observer ) {
    console.log(change);
  }
}

