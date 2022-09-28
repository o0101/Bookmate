import Bookmate from './index.js';

console.log(Bookmate);

const path = Bookmate.tryToFindBookmarksLocation();

console.log({path});

Bookmate.mount(path);

const entries = Bookmate.readdirSync('bookmark_bar', {withFileTypes:true});

console.log(entries);
