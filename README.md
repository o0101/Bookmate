# [📗 Bookmate](https://github.com/i5ik/Bookmate) [![npm](https://img.shields.io/npm/dt/bookmate)](https://www.npmjs.com/package/bookmate) [![npm](https://img.shields.io/npm/v/bookmate?color=%2300ff44)](https://www.npmjs.com/package/bookmate) [![visitors+++](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fi5ik%2Fbookmate&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=visits%20%28today%2Ftotal%29%20since%20Jan%204%202022&edge_flat=false)](https://hits.seeyoufarm.com)

**An append-only key-value store built on Chrome bookmarks, plus an asychronous stream of Bookmark changes**

## Features

Bookmate:

- efficiently observes changes to bookmarks and emits these as an asychronous iterator readable stream
- automatically locates the right [Chrome Profile directory](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md) in a platform-agnostic way by observing bookmark changes
- is possesed of an [fs](https://nodejs.org/docs/latest/api/fs.html#file-system)-like, and simple, NodeJS API: [readFileSync, writeFileSync, promisesWatch etc](#api)

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

## Implementation Progress & Roadmap

- [x] emit change events for URL bookmark additions, deletions and name changes
- [x] existsSync
- [x] readFileSync
- [x] writeFileSync
- [x] readdirSync
- [x] mkdirSync
- [x] promisesWatch (*aka bookmarkChanges)
- [ ] emit events for Folder additions, deletions and name changes

## Decisions & Undecided

- [x] use an async generator to create a stream consunable via [`for await ... of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of)
- [x] utilize an fs-like API for familiarity and structure
- [x] reasearch ways to overcome remote sync change merges overwriting local changes enacted through filesystem that do not have the expected sync-related metadata
  - [x] observe profile directory filesystem changes on manual Bookmark deletion while Chrome is offline: will it save metadata?
    - [x] appears to save in a sync store LevelDB but not certain
  - [x] examine source code to determine exactly how deletion progresses
    - [x] spent a couple hours looking at the code, and while I have a rough idea, nothing conclusive emerges and 
    - [x] certainly no clear way to leverage filesystem changes to insert valid metadata for changes we may make through the file system
  - [x] consider using a bridge made from a browser extension running on a Chrome instance started by the NodeJS process with [`--silent-launch`](https://peter.sh/experiments/chromium-command-line-switches/#silent-launch) and [extensions command-line flags](https://github.com/puppeteer/puppeteer/issues/659#issuecomment-341965254) that is instrumented with [Chrome Remote Debugging Protocol](https://chromedevtools.github.io/devtools-protocol/) to expose [relevant Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/bookmarks/) to NodeJS via the CRDP WebSocket. 
    - [x] Likely possible, certainly so without silent launch (tho with we can probably just instrument an extension background page, even tho there's no visible window). Tho basically this seems like constructing a massive and elaborate [Rube Goldberg machine](https://en.wikipedia.org/wiki/Rube_Goldberg_machine) just to thrust a red rubber glove to push a tiny button that says "Delete Bookmark". 
  - [x] See if Global Sync respects a local "Move" operation so that we may implement Delete via a "Move to Trash" semantic.
    - [x] Unfortuantely Moves are neither propagated by Sync, but nor are they reverted. It's not a loophole, because: 1) The "deletions" (actually moves to a [Trash folder](https://github.com/i5ik/Bookmate/blob/main/src/index.js#L13) we `mkdirSync()` are not propagated to other sync clients (other Chrome browsers on other devices where you are signed in); and 2) it's unclear how long these may actually persist for, if some other change triggers sync to identify these nodes have been moved, then the local changes may be reverted. So I think it's better to avoid providing this possibly unreliable API, than to do so, and end up breaking the implicit promise people took its existence to mean, which they didn't in any case dissuade themselves of by reading the docs or code details more closely. 
- [x] abandon current attempts to implement deletion, renaming and moving that is not reverted by Chrome's [Unified Sync and Storage](https://www.chromium.org/developers/design-documents/sync/unified-sync-and-storage-overview) and [Sync Model API](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/sync/model_api.md)
- [ ] try again in future to examine source code, monitor local filesystem in Chrome Profile directory, and otherwise attempt to innovate a way to perform local changes to the Bookmarks store (besides adds, which we can do, and which *are* propagated), *and* emit somehow the correct sync metadata to ensure: 1) those changes are propagated, and; 2) those changes are not reverted by sync merging in remote 'corrections'. 

## Contributions

Welcome! It's all kind of new so many you can help also set up a contributing guidelines, documentation and so on 😹

## License

AGPL-3.0 &copy; [Cris](https://github.com/i5ik)
