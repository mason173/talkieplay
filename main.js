const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
// 启用 H.265/HEVC 及硬件解码相关特性（需在 app ready 之前设置）
try {
  // 在支持的平台上启用 HEVC（取决于系统编解码器/驱动是否可用）
  app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport,VaapiVideoDecoder');
  // 忽略部分 GPU 黑名单，确保硬件加速可用
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  // 启用硬件视频解码
  app.commandLine.appendSwitch('enable-accelerated-video-decode');
} catch (e) {
  console.warn('⚠️ [启动参数] 配置 HEVC/硬件解码特性失败：', e);
}
const path = require('path');
const fs = require('fs');
const FavoriteWordsDB = require('./database');

// 保持对窗口对象的全局引用，如果你不这样做，当JavaScript对象被垃圾回收时，窗口会自动关闭
let mainWindow;
let favoriteDB;

// Hoisted API config declarations to be globally accessible
let apiConfig = {
  openai: {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo'
  },
  deepseek: {
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },
  currentProvider: 'openai'
};
let apiConfigPath = path.join(app.getPath('userData'), 'api-config.json');

function loadApiConfig() {
  try {
    if (fs.existsSync(apiConfigPath)) {
      const configData = fs.readFileSync(apiConfigPath, 'utf8');
      apiConfig = { ...apiConfig, ...JSON.parse(configData) };
      console.log('🔧 [API配置] 配置加载成功');
    }
  } catch (error) {
    console.error('🔧 [API配置] 配置加载失败:', error);
  }
}

function saveApiConfig(config) {
  try {
    apiConfig = config;
    fs.writeFileSync(apiConfigPath, JSON.stringify(config, null, 2));
    console.log('🔧 [API配置] 配置保存成功');

    // 同步到云端（若启用）
    if (cloudSyncConfig?.enabled && cloudSyncConfig?.syncFolderPath) {
      try {
        const talkiePlayFolder = path.join(cloudSyncConfig.syncFolderPath, 'TalkiePlay');
        const cloudApiConfigPath = path.join(talkiePlayFolder, 'api-config.json');
        fs.writeFileSync(cloudApiConfigPath, JSON.stringify(config, null, 2));
        console.log('☁️ [API配置] 配置已同步到云端');
      } catch (error) {
        console.error('☁️ [API配置] 同步到云端失败:', error);
      }
    }
  } catch (error) {
    console.error('🔧 [API配置] 配置保存失败:', error);
    throw error;
  }
}

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(__dirname, 'assets/icon.png'), // 可选：应用图标
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // 允许本地文件访问
      allowRunningInsecureContent: true, // 允许运行不安全内容
      experimentalFeatures: true, // 启用实验性功能
      enableWebSQL: false,
      plugins: true, // 启用插件支持
      preload: path.join(__dirname, 'preload.js'),
      devTools: true // 允许开发者工具
    },
    show: false, // 初始不显示，等加载完成后再显示
    titleBarStyle: process.platform === 'darwin' ? 'default' : 'default', // 使用默认标题栏，提供更大的拖拽区域
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#00000000',
      symbolColor: '#74b1be',
      height: 40
    } : undefined,
  });

// ==================== API配置位于文件顶部统一定义 ====================

// API配置相关IPC处理
ipcMain.handle('load-api-config', async () => {
  return apiConfig;
});

ipcMain.handle('save-api-config', async (event, config) => {
  try {
    saveApiConfig(config);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('validate-api-config', async (event, config) => {
  try {
    // 基础字段校验
    const errors = [];
    if (!config || typeof config !== 'object') {
      return { success: false, error: '配置无效：应为对象' };
    }
    if (!config.apiKey || typeof config.apiKey !== 'string' || !config.apiKey.trim()) {
      errors.push('缺少或空的 apiKey');
    }
    if (!config.baseUrl || typeof config.baseUrl !== 'string') {
      errors.push('缺少 baseUrl');
    } else {
      try {
        // 验证 URL 格式
        new URL(config.baseUrl);
      } catch {
        errors.push('baseUrl 不是有效的 URL');
      }
    }
    if (!config.model || typeof config.model !== 'string' || !config.model.trim()) {
      errors.push('缺少或空的 model');
    }
    if (errors.length) {
      return { success: false, error: errors.join('；') };
    }

    // 网络连通性与凭证校验（不记录密钥）
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // 拼接校验端点：多数 OpenAI 兼容服务支持 /v1/models
    const base = config.baseUrl.replace(/\/+$/, '');
    const validateUrl = `${base}/models`;

    const res = await fetch(validateUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    }).catch(async (err) => {
      // 若 /models 不存在，尝试请求根路径以确认可达
      if (err.name === 'AbortError') throw new Error('请求超时');
      return null;
    });

    clearTimeout(timeout);

    if (res) {
      if (res.ok) {
        return { success: true, message: '验证成功' };
      }
      // 401/403 通常表示凭证无效
      if (res.status === 401 || res.status === 403) {
        return { success: false, error: 'API Key 无效或无权限' };
      }
      // 429 代表限流，但凭证通常有效
      if (res.status === 429) {
        return { success: true, message: '验证通过（已达限流阈值）' };
      }
      // 404 可能是端点差异，认为可达但无法通过 /models 严格验证
      if (res.status === 404) {
        return { success: true, message: '服务可达，但无法通过 /models 严格验证' };
      }
      // 其他状态码
      return { success: false, error: `服务返回状态码 ${res.status}` };
    }

    // 如果 /models 请求失败但无致命错误，再尝试探测 baseUrl 可达性
    const pingController = new AbortController();
    const pingTimeout = setTimeout(() => pingController.abort(), 4000);
    try {
      const ping = await fetch(base, { method: 'GET', signal: pingController.signal });
      clearTimeout(pingTimeout);
      if (ping.ok || ping.status === 401 || ping.status === 403) {
        // 可达性良好，且 401/403 也表明服务器识别了授权逻辑
        return { success: true, message: '服务可达（未严格验证凭证）' };
      }
      return { success: false, error: `服务可达但返回状态码 ${ping.status}` };
    } catch (e) {
      clearTimeout(pingTimeout);
      return { success: false, error: `无法连接到服务：${e.message}` };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle('export-api-config', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出API配置',
      defaultPath: 'api-config.json',
      filters: [
        { name: 'JSON文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled) {
      fs.writeFileSync(result.filePath, JSON.stringify(apiConfig, null, 2));
      return { success: true, filePath: result.filePath };
    }
    return { success: false, error: '用户取消了操作' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-api-config', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入API配置',
      filters: [
        { name: 'JSON文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const configData = fs.readFileSync(result.filePaths[0], 'utf8');
      const importedConfig = JSON.parse(configData);
      saveApiConfig(importedConfig);
      return { success: true, config: importedConfig };
    }
    return { success: false, error: '用户取消了操作' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

  // 加载应用的index.html文件
  mainWindow.loadFile('index.html');

  // 当窗口准备显示时
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 强制打开开发者工具（临时调试）
    // mainWindow.webContents.openDevTools();
    
    // 输出平台信息
    console.log('平台信息:', {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      electronVersion: process.versions.electron
    });
    
    // 确保数据库已经初始化完成后再通知渲染进程
    if (favoriteDB) {
      console.log('数据库已准备就绪，通知渲染进程');
      mainWindow.webContents.send('database-ready');
    }
    
    // 原来的开发环境检查
    // if (process.env.NODE_ENV === 'development') {
    //   mainWindow.webContents.openDevTools();
    // }
  });
  
  // 添加右键菜单支持
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { Menu, MenuItem } = require('electron');
    const contextMenu = new Menu();
    
    // 如果有选中的文本，添加复制选项
    if (params.selectionText) {
      contextMenu.append(new MenuItem({
        label: '复制',
        accelerator: 'CmdOrCtrl+C',
        click: () => {
          mainWindow.webContents.copy();
        }
      }));
      
      contextMenu.append(new MenuItem({ type: 'separator' }));
    }
    
    // 添加全选选项
    contextMenu.append(new MenuItem({
      label: '全选',
      accelerator: 'CmdOrCtrl+A',
      click: () => {
        mainWindow.webContents.selectAll();
      }
    }));
    
    // 如果有输入框，添加粘贴选项
    if (params.isEditable) {
      contextMenu.append(new MenuItem({ type: 'separator' }));
      contextMenu.append(new MenuItem({
        label: '粘贴',
        accelerator: 'CmdOrCtrl+V',
        click: () => {
          mainWindow.webContents.paste();
        }
      }));
    }
    
    // 显示右键菜单
    contextMenu.popup({ window: mainWindow });
  });

  // 当窗口被关闭时
  mainWindow.on('closed', () => {
    // 取消引用window对象，如果你的应用支持多窗口，通常会把它们存储在一个数组里，此时你应该删除相应的元素
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Electron会在初始化后并准备创建浏览器窗口时，调用这个方法
app.whenReady().then(() => {
  // 强制启用 H.265 支持的命令行参数 - 移到最前面
  console.log('🎥 [启动] 开始配置 H.265/HEVC 视频解码器支持...');
  
  // 基础 H.265 支持
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,PlatformHEVCDecoderSupport,VaapiIgnoreDriverChecks,MediaFoundationH264Encoding,D3D11VideoDecoder');
  app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
  app.commandLine.appendSwitch('enable-accelerated-video-decode');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('force-video-overlays');
  app.commandLine.appendSwitch('enable-hardware-overlays');
  app.commandLine.appendSwitch('ignore-gpu-blacklist');
  app.commandLine.appendSwitch('enable-zero-copy');
  
  // 额外的视频解码优化
  app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');
  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
  app.commandLine.appendSwitch('enable-gpu-compositing');
  app.commandLine.appendSwitch('enable-oop-rasterization');
  
  // 强制启用 H.265 支持的关键参数
  app.commandLine.appendSwitch('enable-experimental-web-platform-features');
  app.commandLine.appendSwitch('enable-unsafe-webgpu');
  app.commandLine.appendSwitch('enable-webgl-draft-extensions');
  app.commandLine.appendSwitch('disable-background-media-suspend');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  
  // 媒体相关参数
  app.commandLine.appendSwitch('disable-web-security');
  app.commandLine.appendSwitch('allow-running-insecure-content');
  app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
  app.commandLine.appendSwitch('enable-media-foundation-async-h264-encoding');
  
  // Windows 特定参数
  if (process.platform === 'win32') {
    console.log('🎥 [启动] 检测到 Windows 系统，启用 Windows 特定的 H.265 支持');
    app.commandLine.appendSwitch('use-angle', 'gl');
    app.commandLine.appendSwitch('enable-d3d11');
    app.commandLine.appendSwitch('enable-dxva-video-decode');
    app.commandLine.appendSwitch('disable-software-rasterizer');
    
    // 强制使用硬件解码
    app.commandLine.appendSwitch('use-gl', 'angle');
    app.commandLine.appendSwitch('use-cmd-decoder', 'validating');
    
    // Windows 特定的 H.265 支持
    app.commandLine.appendSwitch('enable-win32k-lockdown');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    app.commandLine.appendSwitch('enable-media-foundation-clear-strategy');
    app.commandLine.appendSwitch('force-fieldtrials', 'WebRTC-H264WithOpenH264FFmpeg/Enabled/');
  }
  
  // macOS 特定参数
  if (process.platform === 'darwin') {
    console.log('🎥 [启动] 检测到 macOS 系统，启用 macOS 特定的 H.265 支持');
    app.commandLine.appendSwitch('enable-videotoolbox-video-decode');
  }
  
  console.log('🎥 [启动] H.265/HEVC 视频解码器支持配置完成');
  
  // 加载API配置（确保全局可用）
  try {
    loadApiConfig();
  } catch (error) {
    console.error('🔧 [API配置] 初始化加载失败:', error);
  }

  // 初始化数据库
  favoriteDB = new FavoriteWordsDB();
  const dbResult = favoriteDB.initialize();
  if (dbResult.success) {
    console.log('数据库初始化成功:', dbResult.path);
  } else {
    console.error('数据库初始化失败:', dbResult.error);
  }
  
  createWindow();
  
  // 创建应用菜单（依赖 mainWindow 可选项）
  try {
    createMenu();
  } catch (e) {
    console.warn('创建菜单时出现问题:', e.message);
  }
});

// 当全部窗口关闭时退出
app.on('window-all-closed', async () => {
  try {
    // 在关闭前执行自动同步
    if (cloudSyncConfig.enabled && cloudSyncConfig.syncFolderPath && favoriteDB) {
      console.log('☁️ [云同步] 应用关闭前自动保存和同步...');
      
      // 保存当前数据到文件
      await favoriteDB.saveToFile();
      
      // 更新同步时间
      cloudSyncConfig.lastSyncTime = new Date().toISOString();
      saveCloudSyncConfig();
      
      console.log('☁️ [云同步] 关闭前同步完成');
    }
  } catch (error) {
    console.error('☁️ [云同步] 关闭前同步失败:', error);
  }
  
  // 关闭数据库连接
  if (favoriteDB) {
    favoriteDB.close();
  }
  
  // 在macOS上，除非用户用Cmd + Q确定地退出，否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，通常在应用程序中重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 创建菜单
function createMenu() {
  const template = [
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectall', label: '全选' }
      ]
    },
    {
      label: '文件',
      submenu: [
        {
          label: '打开视频',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'ogg'] }
              ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('open-video-file', result.filePaths[0]);
            }
          }
        },
        {
          label: '打开字幕',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: '字幕文件', extensions: ['srt', 'vtt'] }
              ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('open-subtitle-file', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 应用准备就绪时创建菜单 - 已合并到主 whenReady 中

// 处理来自渲染进程的消息
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-file-url', async (event, filePath) => {
  try {
    // Windows 上的特殊处理
    if (process.platform === 'win32') {
      // 确保 Windows 路径格式正确
      const normalizedPath = path.resolve(filePath).replace(/\\/g, '/');
      return `file:///${normalizedPath}`;
    } else {
      return `file://${filePath}`;
    }
  } catch (error) {
    return null;
  }
});

ipcMain.handle('check-file-exists', async (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
});

// 收藏功能相关IPC处理 - 使用SQLite数据库
ipcMain.handle('init-favorite-database', async (event, userDataPath = null) => {
  try {
    let dataPath;
    
    // 如果启用了云同步，优先使用云同步路径
    if (cloudSyncConfig.enabled && cloudSyncConfig.syncFolderPath) {
      dataPath = path.join(cloudSyncConfig.syncFolderPath, 'TalkiePlay');
      console.log('☁️ [云同步] 使用云同步数据路径:', dataPath);
    } else if (userDataPath) {
      dataPath = userDataPath;
    } else {
      dataPath = app.getPath('userData');
    }
    
    // 确保目录存在
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    
    if (!favoriteDB) {
      favoriteDB = new FavoriteWordsDB();
    }
    const result = favoriteDB.initialize(dataPath);
    
    console.log('📚 [数据库] 初始化完成，数据路径:', dataPath);
    return result;
  } catch (error) {
    console.error('📚 [数据库] 初始化失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-favorite-word', async (event, wordData) => {
  try {
    if (!favoriteDB) {
      return { success: false, error: '数据库未初始化' };
    }
    // wordData 可以是字符串（旧格式）或对象（新格式）
    return favoriteDB.addWord(wordData);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-favorite-word', async (event, word) => {
  try {
    if (!favoriteDB) {
      return { success: false, error: '数据库未初始化' };
    }
    return favoriteDB.removeWord(word);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-favorite-words', async () => {
  try {
    if (!favoriteDB) {
      return { success: false, error: '数据库未初始化', words: [] };
    }
    return favoriteDB.getAllWords();
  } catch (error) {
    return { success: false, error: error.message, words: [] };
  }
});

ipcMain.handle('check-word-favorited', async (event, word) => {
  try {
    if (!favoriteDB) {
      return false;
    }
    return favoriteDB.isWordFavorited(word);
  } catch (error) {
    return false;
  }
});

ipcMain.handle('get-favorite-count', async () => {
  try {
    if (!favoriteDB) {
      return 0;
    }
    return favoriteDB.getWordCount();
  } catch (error) {
    return 0;
  }
});

ipcMain.handle('migrate-existing-words', async () => {
  try {
    if (!favoriteDB) {
      return { success: false, error: '数据库未初始化' };
    }
    return favoriteDB.migrateExistingWords();
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-database-path', async () => {
  try {
    if (!favoriteDB) {
      return null;
    }
    return favoriteDB.getDbPath();
  } catch (error) {
    return null;
  }
});

// 兼容旧的文件夹选择功能（可选）
ipcMain.handle('select-favorite-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择数据库存储文件夹（可选，默认使用应用数据目录）'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      // 重新初始化数据库到新路径
      if (favoriteDB) {
        favoriteDB.close();
      }
      favoriteDB = new FavoriteWordsDB();
      const initResult = favoriteDB.initialize(result.filePaths[0]);
      
      if (initResult.success) {
        return { success: true, path: result.filePaths[0], dbPath: initResult.path };
      } else {
        return { success: false, error: initResult.error };
      }
    } else {
      return { success: false, error: '用户取消选择' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 文本文件导出功能
ipcMain.handle('save-text-file', async (event, content, defaultFileName) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出单词本',
      defaultPath: defaultFileName,
      filters: [
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, error: '用户取消了操作' };
    }
    
    // 写入文件
    fs.writeFileSync(result.filePath, content, 'utf8');
    
    return {
      success: true,
      filePath: result.filePath,
      message: '文件保存成功'
    };
  } catch (error) {
    console.error('保存文本文件失败:', error);
    return { success: false, error: error.message };
  }
});

// Anki文件导出功能
ipcMain.handle('save-anki-file', async (event, buffer, defaultFileName) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出Anki记忆卡',
      defaultPath: defaultFileName,
      filters: [
        { name: 'Anki包文件', extensions: ['apkg'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, error: '用户取消了操作' };
    }
    
    // 写入二进制文件
    fs.writeFileSync(result.filePath, Buffer.from(buffer));
    
    return {
      success: true,
      filePath: result.filePath,
      message: 'Anki文件保存成功'
    };
  } catch (error) {
    console.error('保存Anki文件失败:', error);
    return { success: false, error: error.message };
  }
});

// Anki导出功能
ipcMain.handle('export-to-anki', async (event, data) => {
  try {
    const AnkiExport = require('anki-apkg-export').default;
    
    // 创建Anki包
    const apkg = new AnkiExport(data.deckName);
    
    // 获取单词详情并创建记忆卡
    for (const wordDetail of data.words) {
      const word = wordDetail.word || wordDetail;
      const pronunciation = wordDetail.pronunciation || '';
      const translation = wordDetail.translation || '';
      const aiExplanation = wordDetail.aiExplanation || '';
      const exampleSentence = wordDetail.exampleSentence || '';
      const sentenceTranslation = wordDetail.sentenceTranslation || '';
      const screenshot = wordDetail.screenshot || '';
      
      // 构建正面内容（单词、发音、图片）
      const front = `
        <div style="text-align: center; font-family: Arial, sans-serif;">
          <h2 style="color: #2563eb; margin-bottom: 10px;">${word}</h2>
          ${pronunciation ? `<div style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">${pronunciation}</div>` : ''}
          ${screenshot ? `
            <div style="margin-top: 15px;">
              <img src="${screenshot}" alt="视频截图" style="max-width: 300px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
          ` : ''}
        </div>
      `;
      
      // 构建背面内容（完整信息）
      const back = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2563eb; margin-bottom: 5px;">${word}</h2>
            ${pronunciation ? `<div style="color: #6b7280; font-size: 14px;">${pronunciation}</div>` : ''}
            ${screenshot ? `
              <div style="margin-top: 10px;">
                <img src="${screenshot}" alt="视频截图" style="max-width: 250px; max-height: 150px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);" />
              </div>
            ` : ''}
          </div>
          
          ${translation ? `
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h3 style="color: #1f2937; margin-top: 0;">翻译</h3>
              <p style="color: #374151; margin-bottom: 0;">${translation}</p>
            </div>
          ` : ''}
          
          ${aiExplanation ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h3 style="color: #92400e; margin-top: 0;">语境解释</h3>
              <p style="color: #a16207; margin-bottom: 0;">${aiExplanation}</p>
            </div>
          ` : ''}
          
          ${exampleSentence ? `
            <div style="background: #ecfdf5; padding: 15px; border-radius: 8px;">
              <h3 style="color: #065f46; margin-top: 0;">例句</h3>
              <p style="color: #047857; margin-bottom: 8px; font-style: italic;">${exampleSentence}</p>
              ${sentenceTranslation ? `<p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">${sentenceTranslation}</p>` : ''}
            </div>
          ` : ''}
        </div>
      `;
      
      // 添加记忆卡
      apkg.addCard(front, back);
    }
    
    // 生成apkg文件
    const zip = await apkg.save();
    
    // 显示保存对话框
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出Anki记忆卡',
      defaultPath: `${data.deckName}.apkg`,
      filters: [
        { name: 'Anki包文件', extensions: ['apkg'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) {
      return { success: false, error: '用户取消了操作' };
    }
    
    // 保存文件
    fs.writeFileSync(result.filePath, zip);
    
    return {
      success: true,
      filePath: result.filePath,
      message: 'Anki记忆卡导出成功'
    };
  } catch (error) {
    console.error('Anki导出失败:', error);
    return { success: false, error: error.message };
  }
});



// ==================== 云同步功能 ====================

// 云同步配置存储
let cloudSyncConfig = {
  enabled: false,
  syncFolderPath: '',
  lastSyncTime: null
};

// 配置文件路径
const configPath = path.join(app.getPath('userData'), 'cloud-sync-config.json');

// 加载云同步配置
function loadCloudSyncConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      cloudSyncConfig = { ...cloudSyncConfig, ...JSON.parse(configData) };
      console.log('☁️ [云同步] 配置加载成功:', cloudSyncConfig);
    }
  } catch (error) {
    console.error('☁️ [云同步] 配置加载失败:', error);
  }
}

// 保存云同步配置
function saveCloudSyncConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cloudSyncConfig, null, 2));
    console.log('☁️ [云同步] 配置保存成功');
  } catch (error) {
    console.error('☁️ [云同步] 配置保存失败:', error);
  }
}

// 初始化时加载配置
loadCloudSyncConfig();

// 获取云同步配置
ipcMain.handle('get-cloud-sync-config', async () => {
  return cloudSyncConfig;
});

// 选择同步文件夹
ipcMain.handle('select-sync-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择坚果云同步文件夹',
      message: '请选择坚果云同步文件夹，用于存储单词本数据'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('☁️ [云同步] 选择文件夹失败:', error);
    return null;
  }
});

// 启用云同步
ipcMain.handle('enable-cloud-sync', async (event, syncFolderPath) => {
  try {
    // 验证文件夹是否存在
    if (!fs.existsSync(syncFolderPath)) {
      return { success: false, error: '选择的文件夹不存在' };
    }
    
    // 创建TalkiePlay子文件夹
    const talkiePlayFolder = path.join(syncFolderPath, 'TalkiePlay');
    if (!fs.existsSync(talkiePlayFolder)) {
      fs.mkdirSync(talkiePlayFolder, { recursive: true });
    }
    
    // 同步API配置到云端
    if (apiConfig) {
      const cloudApiConfigPath = path.join(talkiePlayFolder, 'api-config.json');
      fs.writeFileSync(cloudApiConfigPath, JSON.stringify(apiConfig, null, 2));
      console.log('☁️ [云同步] API配置已同步到云端');
    }
    
    // 从云端加载API配置（如果存在）
    const cloudApiConfigPath = path.join(talkiePlayFolder, 'api-config.json');
    if (fs.existsSync(cloudApiConfigPath)) {
      try {
        const cloudApiConfig = JSON.parse(fs.readFileSync(cloudApiConfigPath, 'utf8'));
        // 确保apiConfig已初始化
        if (!apiConfig) {
          apiConfig = {
            openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
            deepseek: { apiKey: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
            currentProvider: 'openai'
          };
        }
        // 合并云端配置到本地
        apiConfig = { ...apiConfig, ...cloudApiConfig };
        // 同步到本地API配置文件
        fs.writeFileSync(apiConfigPath, JSON.stringify(apiConfig, null, 2));
        console.log('☁️ [云同步] 从云端加载API配置成功');
      } catch (error) {
        console.error('☁️ [云同步] 从云端加载API配置失败:', error);
      }
    }
    
    // 将本地单词数据迁移到云目录
    try {
      const sourceDbPath = favoriteDB && typeof favoriteDB.getDbPath === 'function' ? favoriteDB.getDbPath() : null;
      if (sourceDbPath && fs.existsSync(sourceDbPath)) {
        const targetDbPath = path.join(talkiePlayFolder, 'wordbook.json');
        fs.copyFileSync(sourceDbPath, targetDbPath);
      }
      const sourceDir = sourceDbPath ? path.dirname(sourceDbPath) : null;
      const sourceImagesDir = sourceDir ? path.join(sourceDir, 'images') : null;
      const targetImagesDir = path.join(talkiePlayFolder, 'images');
      if (sourceImagesDir && fs.existsSync(sourceImagesDir)) {
        fs.mkdirSync(targetImagesDir, { recursive: true });
        // 递归复制图片目录
        fs.cpSync(sourceImagesDir, targetImagesDir, { recursive: true });
      }
      console.log('☁️ [云同步] 已迁移本地单词本与图片到云目录');
    } catch (e) {
      console.error('☁️ [云同步] 迁移本地数据到云目录失败:', e);
    }
    
    // 更新云同步配置并保存
    cloudSyncConfig.enabled = true;
    cloudSyncConfig.syncFolderPath = syncFolderPath;
    cloudSyncConfig.lastSyncTime = new Date().toISOString();
    saveCloudSyncConfig();

    // 切换数据库到云目录并加载
    try {
      if (favoriteDB) {
        favoriteDB.close();
      }
      favoriteDB = new FavoriteWordsDB();
      favoriteDB.initialize(talkiePlayFolder);
      if (favoriteDB && typeof favoriteDB.loadFromFile === 'function') {
        favoriteDB.loadFromFile();
      }
    } catch (e) {
      console.error('☁️ [云同步] 重新初始化云目录数据库失败:', e);
    }
    
    console.log('☁️ [云同步] 启用并切换至云目录完成');
    // 通知渲染进程
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sync-status-update', { status: 'success', message: '云同步已启用并完成初次迁移' });
    }
    return { success: true, message: 'API配置和单词数据同步完成' };
    
  } catch (error) {
    console.error('☁️ [云同步] 启用失败:', error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sync-status-update', { status: 'error', message: '启用云同步失败' });
    }
    return { success: false, error: error.message };
  }
});

// 禁用云同步
ipcMain.handle('disable-cloud-sync', async () => {
  try {
    // 更新配置
    cloudSyncConfig.enabled = false;
    saveCloudSyncConfig();
    
    // 重新初始化数据库到本地路径
    const localDataPath = app.getPath('userData');
    favoriteDB = new FavoriteWordsDB();
    favoriteDB.initialize(localDataPath);
    
    console.log('☁️ [云同步] 已禁用，数据路径:', localDataPath);
    return { success: true, message: '云同步已禁用' };
    
  } catch (error) {
    console.error('☁️ [云同步] 禁用失败:', error);
    return { success: false, error: error.message };
  }
});

// 立即同步
ipcMain.handle('force-sync', async () => {
  try {
    if (!cloudSyncConfig.enabled || !cloudSyncConfig.syncFolderPath) {
      return { success: false, error: '云同步未启用' };
    }
    
    const talkiePlayFolder = path.join(cloudSyncConfig.syncFolderPath, 'TalkiePlay');

    // 通知渲染进程正在同步
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sync-status-update', { status: 'syncing', message: '正在同步到云端…' });
    }
    
    // 同步API配置到云端
    if (apiConfig) {
      const cloudApiConfigPath = path.join(talkiePlayFolder, 'api-config.json');
      fs.writeFileSync(cloudApiConfigPath, JSON.stringify(apiConfig, null, 2));
      console.log('☁️ [云同步] API配置已同步到云端');
    }
    
    // 从云端加载API配置（如果存在）
    const cloudApiConfigPath = path.join(talkiePlayFolder, 'api-config.json');
    if (fs.existsSync(cloudApiConfigPath)) {
      try {
        const cloudApiConfig = JSON.parse(fs.readFileSync(cloudApiConfigPath, 'utf8'));
        if (!apiConfig) {
          apiConfig = {
            openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
            deepseek: { apiKey: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
            currentProvider: 'openai'
          };
        }
        apiConfig = { ...apiConfig, ...cloudApiConfig };
        fs.writeFileSync(apiConfigPath, JSON.stringify(apiConfig, null, 2));
        console.log('☁️ [云同步] 从云端加载API配置成功');
      } catch (error) {
        console.error('☁️ [云同步] 从云端加载API配置失败:', error);
      }
    }
    
    // 同步本地单词本与图片到云目录（如果当前仍在本地目录）
    try {
      const sourceDbPath = favoriteDB && typeof favoriteDB.getDbPath === 'function' ? favoriteDB.getDbPath() : null;
      if (sourceDbPath && fs.existsSync(sourceDbPath)) {
        const sourceDir = path.dirname(sourceDbPath);
        const targetDbPath = path.join(talkiePlayFolder, 'wordbook.json');
        const targetImagesDir = path.join(talkiePlayFolder, 'images');
        // 当源不在云目录时进行复制
        if (sourceDir !== talkiePlayFolder) {
          fs.copyFileSync(sourceDbPath, targetDbPath);
          const sourceImagesDir = path.join(sourceDir, 'images');
          if (fs.existsSync(sourceImagesDir)) {
            fs.mkdirSync(targetImagesDir, { recursive: true });
            fs.cpSync(sourceImagesDir, targetImagesDir, { recursive: true });
          }
          console.log('☁️ [云同步] 已将本地单词本与图片同步到云目录');
        } else {
          // 若已在云目录，确保最新内容已写盘
          if (favoriteDB && !favoriteDB.useSQLite && typeof favoriteDB.saveToFile === 'function') {
            favoriteDB.saveToFile();
          }
        }
      }
    } catch (e) {
      console.error('☁️ [云同步] 同步单词本到云目录失败:', e);
    }
    
    // 更新最后同步时间
    cloudSyncConfig.lastSyncTime = new Date().toISOString();
    saveCloudSyncConfig();
    
    // 重新加载数据库（坚果云会自动同步文件）
    if (favoriteDB) {
      await favoriteDB.loadFromFile();
    }
    
    console.log('☁️ [云同步] 同步完成');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sync-status-update', { status: 'success', message: '同步完成' });
    }
    return { success: true, message: 'API配置和单词数据同步完成' };
    
  } catch (error) {
    console.error('☁️ [云同步] 同步失败:', error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('sync-status-update', { status: 'error', message: '同步失败' });
    }
    return { success: false, error: error.message };
  }
});



// 自动同步函数
async function performAutoSync() {
  try {
    if (!cloudSyncConfig.enabled || !cloudSyncConfig.syncFolderPath) {
      return { success: false, error: '云同步未启用' };
    }
    
    console.log('☁️ [云同步] 执行自动同步操作...');
    
    const talkiePlayFolder = path.join(cloudSyncConfig.syncFolderPath, 'TalkiePlay');
    
    // 从云端加载API配置（如果存在）
    const cloudApiConfigPath = path.join(talkiePlayFolder, 'api-config.json');
    if (fs.existsSync(cloudApiConfigPath)) {
      try {
        const cloudApiConfig = JSON.parse(fs.readFileSync(cloudApiConfigPath, 'utf8'));
        // 确保apiConfig已初始化
        if (!apiConfig) {
          apiConfig = {
            openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
            deepseek: { apiKey: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
            currentProvider: 'openai'
          };
        }
        // 合并云端配置到本地
        apiConfig = { ...apiConfig, ...cloudApiConfig };
        // 同步到本地API配置文件
        fs.writeFileSync(apiConfigPath, JSON.stringify(apiConfig, null, 2));
        console.log('☁️ [云同步] 从云端自动加载API配置成功');
      } catch (error) {
        console.error('☁️ [云同步] 从云端自动加载API配置失败:', error);
      }
    }
    
    // 确保apiConfig已初始化
    if (!apiConfig) {
      apiConfig = {
        openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
        deepseek: { apiKey: '', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
        currentProvider: 'openai'
      };
    }
    
    // 同步本地API配置到云端
    try {
      fs.writeFileSync(cloudApiConfigPath, JSON.stringify(apiConfig, null, 2));
      console.log('☁️ [云同步] API配置已自动同步到云端');
    } catch (error) {
      console.error('☁️ [云同步] API配置自动同步到云端失败:', error);
    }
    
    // 更新最后同步时间
    cloudSyncConfig.lastSyncTime = new Date().toISOString();
    saveCloudSyncConfig();
    
    // 重新加载数据库（坚果云会自动同步文件）
    if (favoriteDB) {
      await favoriteDB.loadFromFile();
    }
    
    console.log('☁️ [云同步] 自动同步完成');
    return { success: true, message: 'API配置和单词数据自动同步完成' };
    
  } catch (error) {
    console.error('☁️ [云同步] 自动同步失败:', error);
    return { success: false, error: error.message };
  }
}

// 修改原有的数据库初始化逻辑以支持云同步
// 注意：原有的 init-favorite-database 处理程序已在第356行定义，这里不重复定义

// ... 云同步辅助：读取任意路径的wordbook并解析为内部结构（含截图Base64）
function loadImageAsBase64From(baseDir, imageRelativePath) {
  try {
    const fullImagePath = path.join(baseDir, imageRelativePath);
    if (fs.existsSync(fullImagePath)) {
      const imageBuffer = fs.readFileSync(fullImagePath);
      const base64Data = imageBuffer.toString('base64');
      return `data:image/jpeg;base64,${base64Data}`;
    }
  } catch (e) {
    console.error('加载外部图片失败:', e);
  }
  return '';
}

function readWordbookFrom(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const baseDir = path.dirname(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    if (data.words && Array.isArray(data.words)) {
      return data.words.map(w => ({
        word: (w.word || '').toString().trim().toLowerCase(),
        pronunciation: w.pronunciation || '',
        translation: w.translation || '',
        aiExplanation: w.aiExplanation || '',
        exampleSentence: w.exampleSentence || '',
        sentenceTranslation: w.sentenceTranslation || '',
        screenshot: w.screenshotFile ? loadImageAsBase64From(baseDir, w.screenshotFile) : (w.screenshot || ''),
        createdAt: w.createdAt || new Date().toISOString(),
        updatedAt: w.updatedAt || w.createdAt || new Date().toISOString()
      }));
    }
    // 兼容简单数组格式
    if (Array.isArray(data)) {
      return data.map(w => ({
        word: (w.word || '').toString().trim().toLowerCase(),
        pronunciation: w.pronunciation || '',
        translation: w.translation || '',
        aiExplanation: w.aiExplanation || '',
        exampleSentence: w.exampleSentence || '',
        sentenceTranslation: w.sentenceTranslation || '',
        screenshot: w.screenshot || '',
        createdAt: w.createdAt || new Date().toISOString(),
        updatedAt: w.updatedAt || w.createdAt || new Date().toISOString()
      }));
    }
  } catch (e) {
    console.error('读取外部wordbook失败:', e);
  }
  return [];
}

function mergeWordLists(localWords = [], remoteWords = []) {
  const map = new Map();
  const put = (item, source) => {
    const key = (item.word || '').toString().trim().toLowerCase();
    if (!key) return;
    const normalized = {
      word: key,
      pronunciation: item.pronunciation || '',
      translation: item.translation || '',
      aiExplanation: item.aiExplanation || '',
      exampleSentence: item.exampleSentence || '',
      sentenceTranslation: item.sentenceTranslation || '',
      screenshot: item.screenshot || '',
      createdAt: item.createdAt || item.updatedAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
    };
    if (!map.has(key)) {
      map.set(key, { ...normalized, _src: source });
    } else {
      const exist = map.get(key);
      const timeA = new Date(exist.updatedAt || 0).getTime();
      const timeB = new Date(normalized.updatedAt || 0).getTime();
      if (timeB > timeA) {
        // 以更新时间较新的为准
        map.set(key, { ...normalized, _src: source });
      } else if (timeB === timeA) {
        // 时间相同，优先保留已有（避免抖动）；若现有缺图而新有图，则补图
        if ((!exist.screenshot || !exist.screenshot.startsWith('data:image/')) && normalized.screenshot && normalized.screenshot.startsWith('data:image/')) {
          exist.screenshot = normalized.screenshot;
          map.set(key, exist);
        }
      }
      // createdAt取两者更早
      const merged = map.get(key);
      merged.createdAt = new Date(Math.min(new Date(merged.createdAt).getTime(), new Date(normalized.createdAt).getTime())).toISOString();
      map.set(key, merged);
    }
  };
  for (const w of localWords) put(w, 'local');
  for (const w of remoteWords) put(w, 'remote');
  return Array.from(map.values()).map(({ _src, ...rest }) => rest);
}