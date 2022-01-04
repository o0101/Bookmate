# bookmate [![npm](https://img.shields.io/npm/dt/bookmate)](https://www.npmjs.com/package/bookmate) [![npm](https://img.shields.io/npm/v/bookmate?color=%2300ff44)](https://www.npmjs.com/package/bookmate) 

Complete API for Chrome bookmatearks: create, read, update, delete and change notifications.  In NodeJS

# features

- correctly calculates the Chrome Bookmarks file checksum using MD5 to allow easy "out of band" insertion and deletion of bookmarks and folders via a simple, fs-like API, which also lets you retrieve them.
- correctly finds and monitors the Chrome Bookmarks file and emits events when you add, delete or update a bookmark.

# roadmap

- emit events for folder changes as well
