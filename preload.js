const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  getFileUrl: (filePath) => ipcRenderer.invoke('get-file-url', filePath),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  saveTextFile: (content, defaultFileName) => ipcRenderer.invoke('save-text-file', content, defaultFileName),
  exportToAnki: (data) => ipcRenderer.invoke('export-to-anki', data),
  
  // 收藏功能 - SQLite数据库版本
  initFavoriteDatabase: (userDataPath) => ipcRenderer.invoke('init-favorite-database', userDataPath),
  saveFavoriteWord: (word) => ipcRenderer.invoke('save-favorite-word', word),
  removeFavoriteWord: (word) => ipcRenderer.invoke('remove-favorite-word', word),
  loadFavoriteWords: () => ipcRenderer.invoke('load-favorite-words'),
  checkWordFavorited: (word) => ipcRenderer.invoke('check-word-favorited', word),
  getFavoriteCount: () => ipcRenderer.invoke('get-favorite-count'),
  getDatabasePath: () => ipcRenderer.invoke('get-database-path'),
  migrateExistingWords: () => ipcRenderer.invoke('migrate-existing-words'),
  
  // 兼容旧版本
  selectFavoriteFolder: () => ipcRenderer.invoke('select-favorite-folder'),
  
  // 监听来自主进程的消息
  onOpenVideoFile: (callback) => {
    ipcRenderer.on('open-video-file', (event, filePath) => {
      callback(filePath);
    });
  },
  
  onOpenSubtitleFile: (callback) => {
    ipcRenderer.on('open-subtitle-file', (event, filePath) => {
      callback(filePath);
    });
  },
  
  // 新增：监听数据库就绪信号
  onDatabaseReady: (callback) => {
    ipcRenderer.on('database-ready', () => {
      callback();
    });
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // API配置功能
  loadApiConfig: () => ipcRenderer.invoke('load-api-config'),
  saveApiConfig: (config) => ipcRenderer.invoke('save-api-config', config),
  validateApiConfig: (config) => ipcRenderer.invoke('validate-api-config', config),
  exportApiConfig: () => ipcRenderer.invoke('export-api-config'),
  importApiConfig: (filePath) => ipcRenderer.invoke('import-api-config', filePath),
  
  // 云同步功能
  getCloudSyncConfig: () => ipcRenderer.invoke('get-cloud-sync-config'),
  selectSyncFolder: () => ipcRenderer.invoke('select-sync-folder'),
  enableCloudSync: (syncFolderPath) => ipcRenderer.invoke('enable-cloud-sync', syncFolderPath),
  disableCloudSync: () => ipcRenderer.invoke('disable-cloud-sync'),
  forceSync: () => ipcRenderer.invoke('force-sync'),
  
  // 监听同步状态更新
  onSyncStatusUpdate: (callback) => {
    ipcRenderer.on('sync-status-update', (event, statusData) => {
      callback(statusData);
    });
  }
});

// 向渲染进程暴露平台信息
contextBridge.exposeInMainWorld('platform', {
  isElectron: true,
  platform: process.platform,
  version: process.versions
});