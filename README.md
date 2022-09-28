# [📗 Bookmate](https://github.com/crisdosyago/Bookmate) [![npm](https://img.shields.io/npm/dt/bookmate)](https://www.npmjs.com/package/bookmate) [![npm](https://img.shields.io/npm/v/bookmate?color=%2300ff44)](https://www.npmjs.com/package/bookmate) [![visitors+++](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fcrisdosyago%2Fbookmate&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=visits%20%28today%2Ftotal%29%20since%20Jan%204%202022&edge_flat=false)](https://hits.seeyoufarm.com)

**An append-only key-value store built on Chrome bookmarks, plus an asychronous stream of Bookmark changes. For NodeJS**

*./src/demo.js:*

```js
  import Bookmate from './index.js';

  console.log(Bookmate);

  const path = Bookmate.tryToFindBookmarksLocation();

  console.log({path});

  Bookmate.mount(path);

  const entries = Bookmate.readdirSync(
    'bookmark_bar', 
    {withFileTypes:true}
  );

  console.log(entries);
```

----------------------------------------

## Features

Bookmate:

- efficiently observes changes to bookmarks and emits these as an asychronous iterator readable stream
- automatically locates the right [Chrome Profile directory](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md) in a platform-agnostic way by observing bookmark changes
- is possesed of an [fs](https://nodejs.org/docs/latest/api/fs.html#file-system)-like, and simple, NodeJS API: [readFileSync, writeFileSync, promisesWatch etc](#api)

## Get

```shell
$ npm i --save bookmate@latest
```

## API 

## `readFileSync(path[, options])`

- `path` [`<SerializedPathArray>`](#type-serializedpatharray) | [`<PathArray>`](#type-patharray) | [`<URL>`](https://nodejs.org/docs/latest/api/url.html#the-whatwg-url-api) path to Bookmark URL 
- `options` [`<Object>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `encoding` [`<string>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) | [`<null>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Null_type) **Default:** `null`
- Returns: [`<string>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) | [`<Buffer>`](https://nodejs.org/docs/latest/api/buffer.html#class-buffer) | [`<BookmarkNode>`](#type-bookmarknode)

Returns the contents of the Bookmark at the path.

If the encoding option is `'json'` then this function returns a [`<BookmarkNode>`](#type-bookmarknode). Otherwise, if the encoding option is specified then this function returns a string, otherwise it returns a buffer.

It cannot be called on a folder. To get the contents of a folder use [`readdirSync()`](#readdirsync-path-options)

## `readdirSync(path[, options])`

- `path` [`<SerializedPathArray>`](#type-serializedpatharray) | [`<PathArray>`](#type-patharray) 
- `options` [`<Object>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `withFileTypes` [`<boolean>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type) **Default:** `false`
- Returns: [`<string[]>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) | [`<BookmarkNode[]>`](#type-bookmarknode)

Reads the contents of the folder.

If `options.withFileTypes` is set to true, the result will contain [`<BookmarkNode>`](#type-bookmarknode) objects.

## Basic usage

*See the demo above*

1. Find your Bookmark folder location 
2. Mount it
3. Read a top-level bookmark folder
4. Do anything!

A note about path syntax. 

You can supply a path in three ways. Here's the code that enumerates that (and I'll explain it below):

```js
  function guardAndNormalizePath(path) {
    if ( isSerializedPath(path) ) {
      return JSON.parse(path);
    } else if ( isArrayPath(path) ) {
      return path;
    } else if ( typeof path === "string" ) {
      if ( isURL(path) ) {
        return [path]; 
      } else if ( ! /https?:/.test(path) ) {
        return path.split('/').filter(seg => seg.length);
      } else {
        throw new SystemError('EINVAL', 
          `Sorry path shorthand ('/' separator syntax)
          can not be used with Bookmark URLs. 
          Please use a path array instead.
          `
        );
      }
    } else {
      throw new SystemError('EINVAL', 
        `Sorry path ${
          path
        } was not in a valid format. Please see the documentation at ${
          LIBRARY_REPO
        }`
      );
    }
  }
```

You can supply a path as a JSON.stringified string, like:

```js
const musicFolderPath = [
  'bookmark_bar',
  'Music Research'
];

const stringifiedPathArray = JSON.stringify(musicFolderPath);

```

To refer to the folder "Music Research" in your bookmarks bar. Or

```js
const stringifiedPathArray = JSON.stringify([
  'bookmark_bar',
  'Music Research',
  'https://sheetmusic.com'
]);
```

To refer to the bookmark with URL `https://sheetmusic.com` in the same folder.

You can also supply it as simple an array.

```js
Bookmate.readdirSync(musicFolder);

Bookmate.readFileSync(musicFolder.push('https://spotify.com'), {encoding: 'json'});
```

I'm sure you get it now.

Equivalent to the above are is:

```js
Bookmate.readdirSync('bookmark_bar/Music reserach');
```

But the following throws an `EINVAL` error:

```
Bookmate.readFileSync('bookmark_bar/Music research/https://spotify.com');
```

Because URLs can be used as part of this "path shorthand".

## &hellip; 🚧

Well this is a little embarrassing 😅 &mdash; I'm sorry, other documentation should go here. 👷‍♀️

The outstanding fs-like functions to document currently are:

- existsSync : does a path exist
- writeFileSync : create a bookmark
- mkdirSync : create a bookmark folder
- promisesWatch (*aka bookmarkChanges) : watch for changes to bookmarks (added, deleted, altered)

And other additional functions to document currently are:

- mount : attach Bookmate to the bookmarks directory (fs-like API now works)
- tryToFindBookmarksLocation : try to find the bookmarks directory
- unmount : un-attach Bookmate 
- getProfileRootDir : try to get the root profile directory for Chrome
- saveWithChecksum : Chrome bookmarks require a checksum, this ensures that works
- and bookmarkChanges (same as promisesWatch, actually--just an alias! 😜 😉 xx 😜)

And, finally, the types that currently need documenting are:

- BookmarkNode : an object containing bookmark data
- SerializedPathArray : a JSON-ified array containing bookmark path segments
- PathArray : the JSON.parsed version of the above

But, not to worry--they (the fs-ones anyway) are [pretty much like the NodeJS fs versions](https://nodejs.org/docs/latest/api/fs.html) so you can head over [there](https://nodejs.org/docs/latest/api/fs.html) or [read the code](https://github.com/crisdosyago/Bookmate/blob/main/src/index.js) to know more&mdash;until somebody
gets around to finishing these docs.

## Implementation Progress & Roadmap 💹

- [x] emit change events for URL bookmark additions, deletions and name changes
- [x] existsSync
- [x] readFileSync
- [x] writeFileSync
- [x] readdirSync
- [x] mkdirSync
- [x] promisesWatch (*aka bookmarkChanges)
- [ ] emit events for Folder additions, deletions and name changes

## Disclaimer

No connection or endorsement expressed or implied with Google, Alphabet, Chrome, Sync or the Chromium authors.

## Contributions ❤️

Welcome! It's all kind of new so many you can help also set up a contributing guidelines, documentation and so on 😹

## License ⚖️

AGPL-3.0 &copy; [Cris](https://github.com/crisdosyago)

## More examples

*Actual [production example](https://github.com/crisdosyago/DiskerNet/blob/1d4675d3d17126246ca8989da6470ba3ffb799af/src/archivist.js#L699):*

```js
import {bookmarkChanges} from 'bookmate';

// ...

async function startObservingBookmarkChanges() {
  for await ( const change of bookmarkChanges() ) {
    switch(change.type) {
      case 'new':     archiveAndIndexURL(change.url);         break;
      case 'delete':  deleteFromIndexAndSearch(change.url);   break;
      default: break;
    }
  }
}
```

-----------------------

# *[📗 Bookmate](https://github.com/crisdosyago/Bookmate)*
