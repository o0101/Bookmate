# Research about how to delete bookmarks using only the filesystem

Normally bookmarks can't be deleted by editing the Bookmarks file (or deleting Bookmarks.bak)

The reason is because Chrome Bookmarks are synced globally, and the sync is conservative with respect to deletion. What this means is that while additions appearing in Bookmarks will be propagated to sync, deletions will not. And any deletion that occurs in Bookmarks on the file system but does not have whatever required "delete" metadata is needed in the Global Sync system, will be undone by the Global Sync merging back in those bookmarks "missing" from the local Bookmarks file. 

So when Chrome deletes something it supplies appropriate sync metadata. What I want to know is, is there a way to create this metadata using only the filesystem?

In order to try to discover this, I'm disabling Chrome's internet access, and deleting a bookmark to see if it saves its intent to distribute a "delete" metadata onto the Global Sync network the next time it's online.

I think there's a fairly high probability it will save that data to disk if it has not sent it on shutdown, the reason is because if it does not, then that deletion will be "undone" next time it reconnects to the inernet. Because it had not sent any deletion metadata. So even tho Chrome is conservative about not losing data, and so biases toward propagatin local adds, but not local filesystem-only deletes, I think it will not want to violate the "human contract" of correctly recording a deletion that was initiated by the human using the Chrome browser front-end.

So for this reason, I think it likely that Chrome will store the deletion metadata somewhere on disk, if it is offline at the time of deletion and therefore unable to send that deletion metadata to the Global Sync network. This storage to disk would then able Chrome to correctly record and propagate that deletion to the Global Sync network (so that it was not subsequently undone by the sync network), at such a time as when Chrome is back online.

So, in order to investigate this possibility, I've been monitoring the file changes under the active profile directory, that Chrome makes, when I delete a bookmakr when it is offline. Here is the list of files changed:

/home/cris/.config/google-chrome/Default/Favicons-journal
/home/cris/.config/google-chrome/Default/Bookmarks.bak
/home/cris/.config/google-chrome/Default/History-journal
/home/cris/.config/google-chrome/Default/Site Characteristics Database/000003.log
/home/cris/.config/google-chrome/Default/shared_proto_db/000003.log
/home/cris/.config/google-chrome/Default/Sync Data/LevelDB/000512.log
/home/cris/.config/google-chrome/Default/Sessions/Tabs_13285670842508557
/home/cris/.config/google-chrome/Default/Sessions/Session_13285670841585329
/home/cris/.config/google-chrome/Default/Sessions/Tabs_13285671763501355
/home/cris/.config/google-chrome/Default/Bookmarks
/home/cris/.config/google-chrome/Local State
/home/cris/.config/google-chrome/Default/Preferences
/home/cris/.config/google-chrome/Default/Sessions/Tabs_13285671805858114
/home/cris/.config/google-chrome/BrowserMetrics/BrowserMetrics-61D2B24F-13152.pma
/home/cris/.config/google-chrome/Default/History-journal
/home/cris/.config/google-chrome/BrowserMetrics/BrowserMetrics-61D2AEB6-12BE7.pma
/home/cris/.config/google-chrome/.com.google.Chrome.bIB7dv
/home/cris/.config/google-chrome/Local State
/home/cris/.config/google-chrome/Default/Site Characteristics Database/000003.log
/home/cris/.config/google-chrome/Default/Sessions/Session_13285671762764035
/home/cris/.config/google-chrome/Local State
/home/cris/.config/google-chrome/Local State
/home/cris/.config/google-chrome/Default/Session Storage/000289.log
/home/cris/.config/google-chrome/Default/History-journal
/home/cris/.config/google-chrome/Default/Sessions/Tabs_13285671805858114
/home/cris/.config/google-chrome/Default/History
/home/cris/.config/google-chrome/SingletonSocket
/home/cris/.config/google-chrome/Default/Favicons-journal
/home/cris/.config/google-chrome/Default/Favicons
/home/cris/.config/google-chrome/Default/Session Storage/000289.log
/home/cris/.config/google-chrome/Default/Service Worker/Database/000003.log
/home/cris/.config/google-chrome/Default/Preferences
/home/cris/.config/google-chrome/Default/Network Persistent State
/home/cris/.config/google-chrome/Local State
/home/cris/.config/google-chrome/GrShaderCache/GPUCache/data_1
/home/cris/.config/google-chrome/Default/GPUCache/data_1
/home/cris/.config/google-chrome/ShaderCache/GPUCache/data_1
/home/cris/.config/google-chrome/chrome_shutdown_ms.txt

Unfortunately searching these with "strings" leaves only one instance of the url for the delete Bookmark. And that is in Bookmark.bak  -- but what about the GUID?

Again there's no metnion of the string GUID.

Let's try to investigate some files that seem interesting:

- /home/cris/.config/google-chrome/chrome_shutdown_ms.txt
  - Just a single number "226" weird


