import fs from 'fs';
const files = [
  '/home/cris/.config/google-chrome/Default/Favicons-journal',
  '/home/cris/.config/google-chrome/Default/Bookmarks.bak',
  '/home/cris/.config/google-chrome/Default/History-journal',
  '/home/cris/.config/google-chrome/Default/Site Characteristics Database/000003.log',
  '/home/cris/.config/google-chrome/Default/shared_proto_db/000003.log',
  '/home/cris/.config/google-chrome/Default/Sync Data/LevelDB/000512.log',
  '/home/cris/.config/google-chrome/Default/Sessions/Tabs_13285670842508557',
  '/home/cris/.config/google-chrome/Default/Sessions/Session_13285670841585329',
  '/home/cris/.config/google-chrome/Default/Sessions/Tabs_13285671763501355',
  '/home/cris/.config/google-chrome/Default/Bookmarks',
  '/home/cris/.config/google-chrome/Local State',
  '/home/cris/.config/google-chrome/Default/Preferences',
  '/home/cris/.config/google-chrome/Default/Sessions/Tabs_13285671805858114',
  '/home/cris/.config/google-chrome/BrowserMetrics/BrowserMetrics-61D2B24F-13152.pma',
  '/home/cris/.config/google-chrome/Default/History-journal',
  '/home/cris/.config/google-chrome/BrowserMetrics/BrowserMetrics-61D2AEB6-12BE7.pma',
  '/home/cris/.config/google-chrome/.com.google.Chrome.bIB7dv',
  '/home/cris/.config/google-chrome/Local State',
  '/home/cris/.config/google-chrome/Default/Site Characteristics Database/000003.log',
  '/home/cris/.config/google-chrome/Default/Sessions/Session_13285671762764035',
  '/home/cris/.config/google-chrome/Local State',
  '/home/cris/.config/google-chrome/Local State',
  '/home/cris/.config/google-chrome/Default/Session Storage/000289.log',
  '/home/cris/.config/google-chrome/Default/History-journal',
  '/home/cris/.config/google-chrome/Default/Sessions/Tabs_13285671805858114',
  '/home/cris/.config/google-chrome/Default/History',
  '/home/cris/.config/google-chrome/SingletonSocket',
  '/home/cris/.config/google-chrome/Default/Favicons-journal',
  '/home/cris/.config/google-chrome/Default/Favicons',
  '/home/cris/.config/google-chrome/Default/Session Storage/000289.log',
  '/home/cris/.config/google-chrome/Default/Service Worker/Database/000003.log',
  '/home/cris/.config/google-chrome/Default/Preferences',
  '/home/cris/.config/google-chrome/Default/Network Persistent State',
  '/home/cris/.config/google-chrome/Local State',
  '/home/cris/.config/google-chrome/GrShaderCache/GPUCache/data_1',
  '/home/cris/.config/google-chrome/Default/GPUCache/data_1',
  '/home/cris/.config/google-chrome/ShaderCache/GPUCache/data_1',
  '/home/cris/.config/google-chrome/chrome_shutdown_ms.txt',
];
for(const path of files) {
  if ( fs.existsSync(path) ) {
    const data = fs.readFileSync(path).toString('hex');
    console.log(data);
  }
}


