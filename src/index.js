// imports (no deps!)
  import crypto from 'crypto';
  import os from 'os';
  import Path from 'path';
  import fs from 'fs';

  import {SystemError} from './error.js';

// constants
  const DEBUG = {
    val: process.env.DEBUG_BOOKMATE || 0,
    showChecksums: false,
  };
	const CHROME_EPOCH = new Date(1601,0,1).getTime();
  const LIBRARY_REPO = `https://github.com/crisdosyago/bookmate`;
  //const TRASH_PATH = ['other', 'Trash (delete by Bookmate)'];
  const EXPECTED_KEYS = [
      'checksum',
      'roots',
      'sync_metadata',
      'version'
    ];
  // Chrome user data directories by platform. 
    // Source 1: https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md 
    // Source 2: https://superuser.com/questions/329112/where-are-the-user-profile-directories-of-google-chrome-located-in
    // Note:
      // Not all the below are now used or supported by this code
  const UDD_PATHS = {
    'win': '%LOCALAPPDATA%\\Google\\Chrome\\User Data',
    'winxp' : '%USERPROFILE%\\Local Settings\\Application Data\\Google\\Chrome\\User Data',
    'macos' : Path.resolve(os.homedir(), 'Library/Application Support/Google/Chrome'),
    'nix' : Path.resolve(os.homedir(), '.config/google-chrome'),
    'chromeos': '/home/chronos',                        /* no support */
    'ios': 'Library/Application Support/Google/Chrome', /* no support */
  };
  // Translate os.platform() to sensible language
  const PLAT_TABLE = {
    'darwin': 'macos',
    'linux': 'nix'
  };
  const FS_WATCH_OPTS = {
    persistent: false,      /* false: thread runs if files are watched, true: it can exit */
    unref: true             /* false: thread exit waits on observer exit, true: it doesn't wait */
  };
  const State = {
    active: new Set(), /* active Bookmark files (we don't know these until file changes) */
    books: {},
    maxId: {},
    mostRecentMountPoint: null  /* the most recently active Bookmark file we watch */
  };
  const PROFILE_DIR_NAME_REGEX = /^(Default|Profile \d+)$/i;
  const isProfileDir = name => PROFILE_DIR_NAME_REGEX.test(name);
  const BOOKMARK_FILE_NAME_REGEX = /^Bookmarks$/i;
  const isBookmarkFile = name => BOOKMARK_FILE_NAME_REGEX.test(name);

const Bookmate = {
  bookmarkChanges,
  getProfileRootDir,
  tryToFindBookmarksLocation,
  mount,
  unmount,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  saveWithChecksum,
  promisesWatch,
};
export default Bookmate;

// get an async stream of changes to any bookmark files of Chrome stable
// for the current account

// watch for changes
  export async function* bookmarkChanges(opts = {}) {
    // try to get the profile directory
      const rootDir = getProfileRootDir();

      if ( !fs.existsSync(rootDir) ) {
        throw new TypeError(`Sorry! The directory where we thought the Chrome profile directories may be found (${rootDir}), does not exist. We can't monitor changes to your bookmarks, so Bookmark Select Mode is not supported.`);
      }

    // state constants and variables (including chokidar file glob observer)
      const observers = [];
      const ps = [];
      let change = false;
      let notifyChange = false;
      let stopLooping = false;
      let shuttingDown = false;

    // create sufficient observers
      const dirs = fs.readdirSync(rootDir, {withFileTypes:true}).reduce((Dirs, dirent) => {
        if ( dirent.isDirectory() && isProfileDir(dirent.name) ) {
          const dirPath = Path.resolve(rootDir, dirent.name);

          if ( fs.existsSync(dirPath) ) {
            Dirs.push(dirPath); 
          }
        }
        return Dirs;
      }, []);
      for( const dirPath of dirs ) {
        // first read it in
          const filePath = Path.resolve(dirPath, 'Bookmarks');
          if ( fs.existsSync(filePath) ) {
            book(filePath);
          }

        const options = Object.assign({}, FS_WATCH_OPTS, opts);
        const observer = fs.watch(dirPath, options);
        DEBUG.val && console.info(options);
        console.log(`Observing ${dirPath}`);
        // Note
          // allow the parent process to exit 
          //even if observer is still active somehow
          options.unref && observer.unref();

        // listen for all events from the observer
          observer.on('change', (event, filename) => {
            filename = filename || '';
            // listen to everything
            const path = Path.resolve(dirPath, filename);
            DEBUG.val && console.log(event, path);
            // but only act if it is a bookmark file
            if ( isBookmarkFile(filename) ) {
              // keep track of recent, active mounts and book an unbooked ones
                if ( ! State.active.has(path) ) {
                  State.active.add(path);
                }
                // it could have just been created
                if ( ! State.books[filePath] ) {
                  book(filePath);
                }
                State.mostRecentMountPoint = path;

              DEBUG.val && console.log(event, path, notifyChange);
              // save the event type and file it happened to
              change = {event, path};
              // drop the most recently pushed promise from our bookkeeping list
              ps.pop();
              // resolve the promise in the wait loop to process the bookmark file and emit the changes
              notifyChange && notifyChange();
            }
          });
          observer.on('error', error => {
            console.warn(`Bookmark file observer for ${dirPath} error`, error);
            observers.slice(observers.indexOf(observer), 1);
            if ( observers.length ) {
              notifyChange && notifyChange();
            } else {
              stopLooping && stopLooping();
            }
          });
          observer.on('close', () => {
            console.info(`Observer for ${dirPath} closed`);
            observers.slice(observers.indexOf(observer), 1);
            if ( observers.length ) {
              notifyChange && notifyChange();
            } else {
              stopLooping && stopLooping();
            }
          });

        observers.push(observer);
      }

    // make sure we kill the watcher on process restart or shutdown
      process.on('SIGTERM', shutdown);
      process.on('SIGHUP', shutdown);
      process.on('SIGINT',  shutdown);
      process.on('SIGBRK', shutdown);

    // the main wait loop that enables us to turn a traditional NodeJS eventemitter
    // into an asychronous stream generator
    waiting: while(true) {
      // Note: code resilience
        //the below two statements can come in any order in this loop, both work

      // get, process and publish changes
        // only do if the change is there (first time it won't be because
        // we haven't yielded out (async or yield) yet)
        if ( change ) {
          const {path} = change;
          change = false;

          try {
            const changes = flatten(
              JSON.parse(fs.readFileSync(path)), 
              {toMap:true, map: State.books[path]}
            );

            for( const changeEvent of changes ) yield changeEvent;
          } catch(e) {
            console.warn(`Error publishing Bookmarks changes`, e);
          }
        }
      
      // wait for the next change
        // always wait tho (to allow queueing of the next event to process)
        try {
          await new Promise((res, rej) => {
            // save these
            notifyChange = res;   // so we can turn the next turn of the loop
            stopLooping = rej;    // so we can break out of the loop (on shutdown)
            ps.push({res,rej});   // so we can clean up any left over promises
          });
        } catch { 
          ps.pop();
          break waiting; 
        }
    }

    shutdown();

    return true;

    async function shutdown() {
      if ( shuttingDown ) return;
      shuttingDown = true;
      console.log('Bookmark observer shutting down...');
      // clean up any outstanding waiting promises
      while ( ps.length ) {
        /* eslint-disable no-empty */
        try { ps.pop().rej(); } finally {}
        /* eslint-enable no-empty */
      }
      // stop the waiting loop
      stopLooping && setTimeout(() => stopLooping('bookmark watching stopped'), 0);
      // clean up any observers
      while(observers.length) {
        /* eslint-disable no-empty */
        try { observers.pop().close(); } finally {}
        /* eslint-enable no-empty */
      }
      console.log('Bookmark observer shut down cleanly.');
    }
  }

// mount functions
  // set a mount point (for fs-like API calls)
  // Note:
    // regardless of any changes detected leading to a 
    // most recent mount point, this functions will
    // bind all fs-like API functions to the newMountPoint 
  export function mount(newMountPoint) {
    if ( ! fs.existsSync(newMountPoint) || ! isBookmarkFile(Path.basename(newMountPoint)) ) {
      throw new TypeError(
        `Could not remount onto ${
          newMountPoint
        } because there was no Bookmark file there.`
      );
    }
    book(newMountPoint);
    State.fixedMountPoint = newMountPoint;
  }

  // clear a fixed mount point
  // Note:
    // any subsequent fs-like API calls made after calling 
    // unmount() will operate on the mostRecentMountPoint
    // detected through any changes. If there is no such 
    // mostRecentMountPoint, or if a watch method has not
    // been run, then fs-like API calls (besides promisesWatch(),
    // and in special cases readFileSync()/existsSync()) will fail.
  export function unmount() {
    if ( State.fixedMountPoint ) {
      State.books[State.fixedMountPoint] = null;
      State.fixedMountPoint = false;
    }
  }

  function guardMounted() {
    const mount = getMount();
    if ( ! mount ) {
      throw new TypeError(`
        Bookmark file is not mounted. No fs-like API operations can be performed.
        You may:
          1) Try setting a mount point with mount(), or 
          2) observing for bookmark changes with promisesWatch() 
            (or, equivalently bookmarkChanges()) while you manually add, 
            delete or alter your bookmarks from your browser, to try
            to automatically detect a valid mount point.
      `);
    }
    return true;
  }

  function getMount() {
    return State.fixedMountPoint || State.mostRecentMountPoint;
  }

  function book(point) {
    const data = fs.readFileSync(point);
    const jData = JSON.parse(data);
    const saved = {};
    State.books[point] = flatten(jData, {toMap:true, saved});
    State.maxId[point] = saved.maxId + 1;
    State.mostRecentMountPoint = point;
    return State.books[point];
  }

// fs-like API
  // watch for changes !
  export async function* promisesWatch(opts) {
    yield* bookmarkChanges(opts);
  }

  // make a directory
  export function mkdirSync(path) {
    if ( existsSync(path) ) return;

    path = guardAndNormalizeFolderPath(path);

    const last = path.pop();
    const data = guardAndNormalizeFolder({name:last});
    if ( path.length ) {
      const saved = {};
      const parent = get(path, saved); 
      if ( ! parent ) {
        throw new SystemError(
          `ENOENT`,
          `The path ${path} did not exist.`
        );
      }
      data.id = '' + State.maxId[saved.mountPoint]++;
      parent.children.push(data);
      sync(saved.mountPoint, saved.bookmarkObj);
    } else {
      throw new SystemError(
        'EPERM', 
        `You cannot add a Bookmark or a folder to the root.` + 
        `Adding a Bookmark like ${
          last
        } requires you specify a path of folders, not just a URL.`
      );
    }
  }

  // check if a path exists !
  export function existsSync(path) {
    DEBUG.val && console.log('existsSync');
    return get(path) === undefined ? false : true; 
  }

  // get a bookmark contents !
  export function readFileSync(path, {encoding} = {}) {
    DEBUG.val && console.log('readFileSync');
    let content = getFile(path);
    if ( content ) {
      if ( encoding !== 'json' ) {
        content = Buffer.from(JSON.stringify(content));
        if ( encoding && encoding !== 'buffer' ) {
          content = content.toString(encoding);
        }
      } 
      return content;
    } else {
      throw new SystemError('ENOENT', `Bookmark ${path} does not exist`);
    }
  }

  // get a folder contents !
  export function readdirSync(path, {withFileTypes, encoding} = {}) {
    DEBUG.val && console.log('readdirSync');
    let folder = getFolder(path);
    if ( folder ) {
      const enc = s => encoding === 'buffer' ? Buffer.from(s) : s;
      if ( withFileTypes ) {
        return folder.children.map(item => {
          if ( item.type === 'folder' ) {
            delete item.children;
          } 
          return item;
        });
      } else {
        return folder.children.map(item => {
          if ( Object.prototype.hasOwnProperty.call(item, 'url') ) {
            return enc(item.url);
          }
          return enc(item.name);
        });
      }
    } else {
      throw new SystemError('ENOENT', `Folder ${path} does not exist`);
    }
  }

  // write a bookmark
  export function writeFileSync(path, data) {
    DEBUG.val && console.log('writeFileSync');
    path = guardAndNormalizeFilePath(path);
    data = guardAndNormalizeFile(data);
    const last = path.pop();
    if ( path.length ) {
      const saved = {};
      const parent = get(path, saved); 
      if ( ! parent ) {
        throw new SystemError(
          `ENOENT`,
          `The path ${path} did not exist.`
        );
      }
      data.url = last; // it must be this way
      data.id = '' + State.maxId[saved.mountPoint]++;
      parent.children.push(data);
      sync(saved.mountPoint, saved.bookmarkObj);
    } else {
      throw new SystemError(
        'EPERM', 
        `You cannot add a Bookmark to the root.` + 
        `Adding a Bookmark like ${
          last
        } requires you specify a path of folders, not just a URL.`
      );
    }
  }

// helpers
  /*
  function pathType(path) {
    try {
      guardAndNormalizeFilePath(path);
      return 'url';
    } catch {}
    try {
      guardAndNormalizeFolderPath(path);
      return 'folder';
    } catch {}
    throw new SystemError(
      `EINVAL`,
      `Path ${path} is neither a URL nor a folder and not of any known type`
    );
  }
  */

  function guardAndNormalizeFile(entry) {
    return guardAndNormalizeEntry(entry, {strict:'url'});
  }

  function guardAndNormalizeFolder(entry) {
    return guardAndNormalizeEntry(entry, {strict:'folder'});
  }

  function guardAndNormalizeEntry(entry, {strict} = {}) {
    let data;

    if ( Buffer.isBuffer(entry) ) {
      data = entry.toString();
    }

    if ( isSerializedFile(entry) ) {
      data = JSON.parse(entry);
    } else if ( typeof entry === "object" && typeof entry.name === "string" ) {
      data = JSON.parse(JSON.stringify(entry));
    } else {
      throw new SystemError(
        `EINVAL`,
        `${entry} is not a valid Bookmark entry in any known format.`
      );
    }

    let {id, name, url, type, date_added, date_modified, guid, children} = data;

    if ( ! strict && ! type ) {
      if ( url && ! children) {
        type = 'url';
      } else {
        type = 'folder';
      }
    } else if ( strict ) {
      if ( strict === 'url' || strict === 'folder' ) {
        type = strict; 
      } else {
        throw new SystemError(
          `EINVAL`,
          `Only 'url' or 'folder' are supported types ` +
            `for strict-mode guard and normalizing of entries.` +
            `Received strict:${strict}.`
        )
      }
    }

    const file = {
      type,
      id: id || '' + State.maxId[getMount()]++,
      guid: guid || nextUUID(),
      date_added: date_added || toChromeTime(Date.now()),
      date_modified: date_modified || toChromeTime(Date.now())
    };

    if ( type === 'url' ) {
      file.url = url;
      file.name = name;
      if ( ! isURL(url) && data.type !== 'url' ) {
        throw new SystemError(
          `EINVAL`,
          `A bookmark must have a url field that is a valid URL. ` +
            `Received url: ${url} which was not invalid.`
        );
      }
      if ( !(typeof name === "string") ) {
        throw new SystemError(
          `EINVAL`,
          `A bookmark must have a name field that is a string. ` +
            `Received name: ${url} which was not.`
        );
      }
    } else if ( type === 'folder' ) {
      file.name = name; 
      file.date_modified = date_modified || file.date_added;
      if ( !(typeof file.name === "string" ) ) {
        throw new SystemError(
          `EINVAL`,
          `A bookmark folder must have a name field that is a string. ` +
            `Received name: ${url} which was not.`
        );
      }
      file.children = [];
    } else {
      throw new SystemError(
        'EINVAL',
        `Not a valid type of Bookmark entry ${type}`
      );
    }

    {
      const d = fromChromeTime(file.date_modified);
      if ( !(Object.prototype.toString.call(d) === '[object Date]' && isFinite(d)) ) {
        throw new SystemError(
          `EINVAL`,
          `A bookmark entries date fields must be valid if supplied. ` +
            `Received date_modified: ${file.date_modified} which was not.`
        );
      }
    }
    {
      const d = fromChromeTime(file.date_added);
      if ( !(Object.prototype.toString.call(d) === '[object Date]' && isFinite(d)) ) {
        throw new SystemError(
          `EINVAL`,
          `A bookmark entries date fields must be valid if supplied. ` +
            `Received date_added: ${file.date_added} which was not.`
        );
        
      }
    }
   
    return file;
  }

  function fromChromeTime(chromeStamp) {
    return new Date(CHROME_EPOCH + parseInt(chromeStamp, 10)/1000)
	}

  function toChromeTime(hippyEpochStamp) {
    const stamp = new Date(hippyEpochStamp).getTime();
    return ((stamp - CHROME_EPOCH)*1000).toString();
  }

  // compute the chrome bookmark checksum
    // source 1: https://gist.github.com/simon816/afde4d57d5dab8e80120e35596008834
    // source 2: https://source.chromium.org/chromium/chromium/src/+/main:components/bookmarks/browser/bookmark_codec.cc;l=130;drc=345ca36745fcd18c97ac6dad6a1437a51dcbeb3e
  function computeChecksum(bookmarkObj) {
		const hash = crypto.createHash('md5');
    const {roots} = bookmarkObj;

		update_digest(roots['bookmark_bar']);
		update_digest(roots['other']);
		update_digest(roots['synced']);

		return hash.digest('hex'); 

		function digest_url(url) {
			hash.update(url.id)
			hash.update(Buffer.from(url['name'], 'utf16le'))
			hash.update('url')
			hash.update(Buffer.from(url['url'], 'ascii'))
    }	

		function digest_folder(folder) {
			hash.update(folder.id)
			hash.update(Buffer.from(folder['name'], 'utf16le'))
			hash.update('folder')
			for (const child of folder['children']) {
        update_digest(child)
      }
    }

		function update_digest(node) {
      ({'folder': digest_folder, 'url': digest_url})[node['type']](node);
    }
  }

  export function saveWithChecksum(filePath) {
    const obj = getBookmarkObj(filePath);
    sync(filePath, obj);
  }

  function nextUUID() {
    return crypto.randomUUID();
  }

  function sync(file, obj) {
    obj.checksum = computeChecksum(obj);
    fs.writeFileSync(file, JSON.stringify(obj,null,2));
  }

  function getFile(path) {
    path = guardAndNormalizeFilePath(path);
    return get(path);
  }

  function getFolder(path) {
    path = guardAndNormalizeFolderPath(path);
    return get(path);
  }

  // get anything
    // Note on saved:
      // saved is a pointer object to pass back metadata 
      // associated with running the query 
  function get(path, saved = {}) { 
    path = Array.from(path);
    const mountPoint = getMount();
    saved.mountPoint = mountPoint;
    if ( path.length === 1 && isURL(Last(path)) ) {
      const url = Last(path);
      // special behaviour if path is JUST a url (no path)
      // check every bookmark file under every profile we have seen 
      // unless there is a mount point
      if ( ! mountPoint ) {
        return Object.keys(State.books).filter(key => {
          if ( State.active.size == 0 ) return true; 
          return State.active.has(key);
        }).map(key => State.books[key])
          .map(map => map.get(url))
          .filter(s => s)[0];
      } else {
        return State.books[mountPoint].get(url);
      }
    } else {
      guardMounted(); 
      const bookmarkObj = getBookmarkObj(mountPoint);
      saved.bookmarkObj = bookmarkObj;
      const {roots} = bookmarkObj;
      saved.parents = [path[0]];
      let node = roots[path.shift()];
      if ( ! node ) {
        throw new SystemError(
          'EINVAL', 
          `Path must begin with a valid root node: ${Object.keys(roots)}`
        );
      }
      while(node && path.length) {
        const seg = path.shift();
        saved.parents.push(seg);
        if ( ! path.length && isURL(seg) ) {
          node = node.children.find(child => child.type === 'url' && child.url === seg);
        } else {
          node = node.children.find(child => child.type === 'folder' && child.name === seg);
        }
      }
      if ( !node || path.length ) {
        return undefined; 
      }
      return node;
    }
  }

  function Last(arr) {
    return arr[arr.length-1];
  }

  function guardAndNormalizePath(path) {
    if ( isSerializedPath(path) ) {
      return JSON.parse(path);
    } else if ( isArrayPath(path) ) {
      return path;
    } else if ( typeof path === "string" ) {
      if ( ! /https?:/.test(path) ) {
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

  function guardAndNormalizeFolderPath(path) {
    path = guardAndNormalizePath(path);
    if ( isURL(Last(path)) ) {
      throw new SystemError(
        `EINVAL`,
        `Sorry, rmdir only works on folders not on bookmarks.
          Paths that end in URLs refer to bookmarks, those that
          end in plain strings refer to folders.
          You passed: ${path} which is a bookmarks path.
        `
      );
    }
    return path;
  }

  function guardAndNormalizeFilePath(path) {
    path = guardAndNormalizePath(path);
    if ( !isURL(Last(path)) ) {
      throw new SystemError(
        `EINVAL`,
        `Sorry, unlink only works on bookmarks, not on folders. 
          Paths that end in URLs refer to bookmarks, those that
          end in plain strings refer to folders.
          You passed: ${path} which is not a bookmark path.
        `
      );
    }
    return path;
  }

  function isURL(x) {
    try {
      new URL(x);
      return true;
    } catch { 
      return false;
    }
  }

  function isSerializedFile(data) {
    // perf: cache this array in a lastParsedPath global
    // which is set to false on failure
    try {
      return data.type === 'url' 
        || data.type === 'folder' 
        || isURL(data.url)
        || (typeof data.name === "string")
      ;
    } catch {
      return false;
    }
  }

  function isSerializedPath(x) {
    // perf: cache this array in a lastParsedPath global
    // which is set to false on failure
    try {
      return isArrayPath(JSON.parse(x));
    } catch {
      return false;
    }
  }

  function isArrayPath(x) {
    return Array.isArray(x) && x.every(seg => typeof seg === "string");
  }

  export function tryToFindBookmarksLocation() {
    const rootDir = getProfileRootDir();
    const dirs = fs.readdirSync(rootDir, {withFileTypes:true}).reduce((Dirs, dirent) => {
      if ( dirent.isDirectory() && isProfileDir(dirent.name) ) {
        const dirPath = Path.resolve(rootDir, dirent.name);

        if ( fs.existsSync(dirPath) ) {
          Dirs.push(dirPath); 
        }
      }
      return Dirs;
    }, []);
    for( const dirPath of dirs ) {
      // first read it in
        const filePath = Path.resolve(dirPath, 'Bookmarks');
        if ( fs.existsSync(filePath) ) {
          return filePath;
        }
    }
    throw new TypeError(`Could not find Bookmarks directory under standard chrome profile directory`);
  }

  export function getProfileRootDir() {
    const plat = os.platform();
    let name = PLAT_TABLE[plat];
    let rootDir;

    DEBUG.val && console.log({plat, name});

    if ( !name ) {
      if ( plat === 'win32' ) {
        // because Chrome profile dir location only changes in XP
          // we only care if it's XP or not and so
          // we try to resolve based on the version major and minor (given by release)
          // source: https://docs.microsoft.com/en-us/windows/win32/sysinfo/operating-system-version?redirectedfrom=MSDN
        const rel = os.release();
        const ver = parseFloat(rel); 
        if ( !Number.isNaN(ver) && ver <= 5.2 ) {
          // this should be reliable
          name = 'winxp';
        } else {
          // this may not be reliable, but we just do it
          name = 'win';
        }
      } else {
        throw new TypeError(
          `Sorry! We don't know how to find the default Chrome profile on OS platform: ${plat}`
        );
      }
    }

    if ( UDD_PATHS[name] ) {
      rootDir = Path.resolve(resolveEnvironmentVariablesToPathSegments(UDD_PATHS[name]));
    } else {
      throw new TypeError(
        `Sorry! We don't know how to find the default Chrome profile on OS name: ${name}`
      );
    }

    return rootDir;
  }

  function flatten(bookmarkObj, {toMap: toMap = false, map, saved: saved = {}} = {}) {
    const nodes = [...Object.values(bookmarkObj.roots)];
    const urls = toMap? (map || new Map()) : [];
    const urlSet = new Set();
    const changes = [];
    let maxId = 0;

    while(nodes.length) {
      const next = nodes.pop();
      let {id, name, type, url} = next;
      id = parseInt(id);
      if ( id > maxId ) {
        maxId = id;
      }
      switch(type) {
        case "url":
          if ( toMap ) {
            if ( map ) {
              if ( urls.has(url) ) {
                const {name:oldName} = urls.get(url);
                if ( name !== oldName ) {
                  if ( !urlSet.has(url) ) {
                    changes.push({
                      type: "Title updated",
                      url,
                      oldName, 
                      name
                    });
                  }
                }
              } else {
                changes.push({
                  type: "new",
                  name, url
                });
              }
            } 
            if ( !urlSet.has(url) ) {
              urls.set(url, next);
            }
            urlSet.add(url);
          } else {
            urls.push(next);
          }
          break;
        case "folder":
          nodes.push(...next.children);
          break;
        default:
          console.info("New type", type, next);
          break;
      }
    }

    if (map) {
      [...map.keys()].forEach(url => {
        if ( !urlSet.has(url) ) {
          changes.push({
            type: "delete",
            url
          });
          map.delete(url);
        }
      });
    }

    saved.maxId = maxId;

    return map ? changes : urls;
  }

  function getBookmarkObj(filePath) {
    let obj;
    try {
      obj = JSON.parse(fs.readFileSync(filePath).toString());
    } catch(e) {
      throw new TypeError(`Could not load Bookmark file ${filePath}, because: ${e+''}`);
    }
    if ( !EXPECTED_KEYS.some(key => obj[key]) ) {
      console.warn(
        new TypeError(`Bookmark file ${filePath} does not have the structure we expect.`)
      );
    }
    const expectedChecksum = computeChecksum(obj);
    const {checksum} = obj;
    DEBUG.showChecksums && console.log(expectedChecksum, checksum);
    return obj;
  }

  // source: https://stackoverflow.com/a/33017068
  function resolveEnvironmentVariablesToPathSegments(path) {
    return path.replace(/%([^%]+)%/g, function(_, key) {
      return process.env[key];
    });
  }

// planned but incomplete
// Notes:
  // These methods are limited by the current approach
  // (editing the Bookmark file)
  // Their effects Sync but works locally 
  // which probably means it only works temporarily
  // until sync notices something is amiss somehoh
  /*
    // delete an entry (actually move it to Trash)
    export function unlinkSync(path) {
      path = guardAndNormalizePath(path);
      if ( ! existsSync(TRASH_PATH) ) {
        mkdirSync(TRASH_PATH);
      }
      const tip = Last(path);
      renameSync(path, [...TRASH_PATH, tip]);
    }

    // rename an entry
    export function renameSync(oldPath, newPath) {
      if ( ! existsSync(oldPath) ) {
        throw new SystemError(
          `ENOENT`,
          `Source path ${oldPath} does not exist so it cannot be renamed.`
        );
      }
      oldPath = guardAndNormalizePath(oldPath);
      newPath = guardAndNormalizePath(newPath);
      const oldType = pathType(oldPath); 
      const newType = pathType(newPath);
      if ( oldType !== newType ) {
        throw new SystemError(
          `EINVAL`,
          `Source and destination paths must have the same type, but they were: ${
            oldType
          } and ${
            newType
          }`
        );
      }

      let node = get(oldPath);

      remove(oldPath);

      // Semantics Idea
        // could actually check if newPath exists first 
        // and overwrite instead of pushing

      const saved = {};
      const newLast = newPath.pop();
      const newParent = get(newPath, saved);
    
      if ( oldType === 'url' ) {
        // it must be this way
        node.url = newLast;
        node = guardAndNormalizeFile(node);
      } else {
        node.name = newLast;
        node = guardAndNormalizeFolder(node);
      }
      node.id = '' + State.maxId[getMount()]++;
      //node.guid = nextUUID();

      newParent.children.push(node);
      sync(saved.mountPoint, saved.bookmarkObj);
    }

    // delete a folder
    export function rmdirSync(path) {
      DEBUG.val && console.log('rmdirSync');
      path = guardAndNormalizeFolderPath(path);
      const last = path.pop();
      if ( path.length ) {
        const saved = {};
        const parent = get(path, saved); 
        if ( ! parent ) {
          throw new SystemError(
            `ENOENT`,
            `The path ${path} did not exist.`
          );
        }
        const index = parent.children.findIndex(({name}) => name === last);
        parent.children.splice(index, 1);
        sync(saved.mountPoint, saved.bookmarkObj);
      } else {
        throw new SystemError(
          'EPERM', 
          `Deleting a root folder like ${last} is not permitted.`
        );
      }
    }

    // internal use - temporarily delete a bookmark
    // Note
      // this only works temporarily because Chrome will sync
      // any entries that do not have sufficient 'deleted' 
      // metadata back into the local copy, and there's 
      // no simple way to generate that metadata using 
      // the filesystem that I have seen.
      // That's the reason we implement 
      // unlinkSync as a 'move to Trash'
    function remove(path) {
      DEBUG.val && console.log('(internal) remove');
      // handle folder entry
      console.info(`Handle folder entries`);
      path = guardAndNormalizeFilePath(path);
      const last = path.pop();
      if ( path.length ) {
        const saved = {};
        const parent = get(path, saved); 
        if ( ! parent ) {
          throw new SystemError(
            `ENOENT`,
            `The path ${path} did not exist.`
          );
        }
        const index = parent.children.findIndex(({url}) => url === last);
        parent.children.splice(index, 1);
        sync(saved.mountPoint, saved.bookmarkObj);
      } else {
        throw new SystemError(
          'EINVAL', 
          `Deleting a Bookmark like ${last} requires a full path, not just a URL.`
        );
      }
    }
  */

