import Bookmate from './index.js';

console.log(Bookmate);

const path = Bookmate.tryToFindBookmarksLocation();

console.log({path});

Bookmate.mount(path);

/*
Bookmate.writeFileSync(['bookmark_bar', 'https://www.dia.mil'], {
  name: "DIA",
  type: "url"
});
*/

{
  const entries = Bookmate.readdirSync('bookmark_bar', {withFileTypes:true});

  console.log(entries);
}

let entry;
try {
  entry = Bookmate.readFileSync([
    'bookmark_bar',
    'https://www.dia.mil/'
  ], {encoding: 'json'});

  entry.name += " Hello ";
} catch(e) {
  entry = {
    name: "DIA",
    type: "url"
  }
}
console.log({entry});

Bookmate.writeFileSync(['bookmark_bar', 'https://www.dia.mil/'], entry);

{
  const entries = Bookmate.readdirSync('bookmark_bar', {withFileTypes:true});

  console.log(entries);
}
