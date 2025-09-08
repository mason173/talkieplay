// 应用初始化
document.addEventListener('DOMContentLoaded', async function() {
  // Electron环境检测
  const isElectron = window.platform && window.platform.isElectron;
  
  console.log('运行环境:', isElectron ? 'Electron桌面应用' : '浏览器');
  
  // DOM 元素引用
  const elements = {
    // 视频相关
    videoDropZone: document.getElementById('videoDropZone'),
    videoFileInput: document.getElementById('videoFileInput'),
    videoContainer: document.getElementById('videoContainer'),
    videoPlayer: document.getElementById('videoPlayer'),
    uploadCard: document.getElementById('uploadCard'),
    
    // 字幕相关
    subtitleFileInput: document.getElementById('subtitleFileInput'),
    subtitleList: document.getElementById('subtitleList') || null, // 可能不存在
    subtitleItems: document.getElementById('subtitleItems') || null, // 可能不存在
    subtitleToggleSwitch: document.getElementById('subtitleToggleSwitch'),
    videoSubtitleOverlay: document.getElementById('videoSubtitleOverlay'),
    videoSubtitleContent: document.getElementById('videoSubtitleContent'),
    
    // 词典相关
    dictionaryPanel: document.getElementById('dictionaryPanel'),
    dictionaryOverlay: document.getElementById('dictionaryOverlay'), // 字典面板遮罩层
    dictionaryContent: document.getElementById('dictionaryContent'),
    dictionaryEmpty: document.getElementById('dictionaryEmpty'),
    dictionaryLoading: document.getElementById('dictionaryLoading'),
    dictionaryResult: document.getElementById('dictionaryResult'),
    dictionaryError: document.getElementById('dictionaryError'),
    closeDictionaryBtn: document.getElementById('closeDictionaryBtn'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    favoriteIcon: document.getElementById('favoriteIcon'),
    
    // 主页相关
    homePage: document.getElementById('homePage'),
    mainContent: document.querySelector('.main-content'),
    homeBtn: document.getElementById('homeBtn'),
    continueLastVideo: document.getElementById('continueLastVideo'),
    openNewVideo: document.getElementById('openNewVideo'),
    lastVideoInfo: document.getElementById('lastVideoInfo'),
    
    // 单词本相关
    wordBook: document.getElementById('wordBook'),
    wordBookPage: document.getElementById('wordBookPage'),
    wordBookBackBtn: document.getElementById('wordBookBackBtn'),
    wordBookCount: document.getElementById('wordBookCount'),
    wordBookEmpty: document.getElementById('wordBookEmpty'),
    wordList: document.getElementById('wordList'),
    wordBookInfo: document.getElementById('wordBookInfo'),
    exportWordsBtn: document.getElementById('exportWordsBtn'),
    
    // API配置相关
    apiConfigBtn: document.getElementById('apiConfigBtn'),
    apiConfigDialog: document.getElementById('apiConfigDialog'),
    closeApiConfigDialog: document.getElementById('closeApiConfigDialog'),
    saveApiConfigBtn: document.getElementById('saveApiConfigBtn'),
    resetApiConfigBtn: document.getElementById('resetApiConfigBtn'),
    
    // 翻译服务配置
    googleTranslateEnabled: document.getElementById('googleTranslateEnabled'),
    googleTranslateKey: document.getElementById('googleTranslateKey'),
    googleTranslateStatus: document.getElementById('googleTranslateStatus'),
    toggleGoogleKeyVisibility: document.getElementById('toggleGoogleKeyVisibility'),
    deeplTranslateEnabled: document.getElementById('deeplTranslateEnabled'),
    deeplTranslateKey: document.getElementById('deeplTranslateKey'),
    deeplTranslateStatus: document.getElementById('deeplTranslateStatus'),
    toggleDeeplKeyVisibility: document.getElementById('toggleDeeplKeyVisibility'),
    
    // AI服务配置
    deepseekEnabled: document.getElementById('deepseekEnabled'),
    deepseekKey: document.getElementById('deepseekKey'),
    deepseekStatus: document.getElementById('deepseekStatus'),
    toggleDeepseekKeyVisibility: document.getElementById('toggleDeepseekKeyVisibility'),
    zhipuEnabled: document.getElementById('zhipuEnabled'),
    zhipuKey: document.getElementById('zhipuKey'),
    zhipuStatus: document.getElementById('zhipuStatus'),
    toggleZhipuKeyVisibility: document.getElementById('toggleZhipuKeyVisibility')
  };
  
  // API 配置 - 现在从用户配置中动态加载
  let API_CONFIG = {
    // 默认配置（作为后备）
    GOOGLE_TRANSLATE_KEY: '',
    DEEPL_API_KEY: '',
    DEEPSEEK_KEY: '',
    ZHIPU_KEY: ''
  };
  
  // 用户API配置状态
  let userApiConfig = {
    translation: {
      google: { enabled: false, key: '' },
      deepl: { enabled: false, key: '' }
    },
    ai: {
      deepseek: { enabled: false, key: '' },
      zhipu: { enabled: false, key: '' }
    }
  };
  
  // 应用状态
  const state = {
    subtitlesVisible: false,  // 默认关闭Track字幕，只显示可交互字幕
    wasPlayingBeforeHover: false,
    hoverPauseTimeout: null,
    currentSubtitleContext: '',
    loadedSubtitles: [],
    selectedAIService: 'zhipu',  // 默认使用智谱AI
    selectedTranslationService: 'google',  // 默认使用谷歌翻译
    // 收藏功能相关 - SQLite版本
    currentWord: '',
    favoriteWords: new Set(),  // 本地缓存，从数据库同步
    // 播放进度记忆功能
    currentVideoFile: '',  // 当前视频文件路径或名称
    playbackProgress: new Map(),  // 存储每个视频的播放进度 {文件路径: {currentTime, duration, lastWatched}}
    // 字幕文件记忆功能
    videoSubtitles: new Map(),  // 存储每个视频对应的字幕文件 {视频文件路径: [{fileName, filePath, content, isElectron}]}
    // 最后打开的视频记忆功能
    lastOpenedVideo: null  // 存储最后打开的视频信息 {filePath, fileName, timestamp}
  };
  
  // 全局 H.265 解码器实例
  let h265Decoder = null;
  
  // 初始化 H.265 解码器
  async function initH265Decoder() {
    try {
      if (typeof H265VideoDecoder !== 'undefined') {
        h265Decoder = new H265VideoDecoder();
        console.log('🎥 [初始化] H.265 解码器初始化成功');
      } else {
        console.warn('⚠️ [初始化] H.265 解码器未加载');
      }
    } catch (error) {
      console.error('🚫 [初始化] H.265 解码器初始化失败:', error);
    }
  }
  
  // 检测是否为H.265视频
  function isH265Video(fileName) {
    if (!fileName) return false;
    const lowerName = fileName.toLowerCase();
    
    // 检查文件名中的H.265标识
    const h265Indicators = [
      'x265', 'h265', 'hevc', 
      'h.265', 'x.265',
      '.265.', '.h265.',
      'hevc.', '.hevc',
      'hev1', 'hvc1'
    ];
    
    return h265Indicators.some(indicator => lowerName.includes(indicator));
  }
  
  // 强制启用H.265支持
  async function forceEnableH265Support() {
    console.log('🎬 [H.265] 尝试强制启用系统H.265支持');
    
    try {
      // 创建临时video元素测试H.265支持
      const testVideo = document.createElement('video');
      testVideo.style.display = 'none';
      document.body.appendChild(testVideo);
      
      // 设置H.265兼容的类型
      testVideo.muted = true;
      
      // 添加兼容性头部
      if (h265Decoder && h265Decoder.forceCompatibility) {
        console.log('🎬 [H.265] 使用解码器强制兼容性处理');
        return true;
      }
      
      // 清理测试元素
      document.body.removeChild(testVideo);
      
    } catch (error) {
      console.error('🚫 [H.265] 强制启用失败:', error);
    }
    
    return false;
  }
  
  // 辅助函数：显示媒体格式建议
  function showMediaFormatSuggestion() {
    const suggestion = `
📝 媒体格式建议：

✅ 推荐格式：
• MP4 + H.264 编码 (x264)
• WebM + VP8/VP9 编码

⚠️ 可能不支持：
• MP4 + H.265 编码 (x265)
• AVI 容器格式
• MKV 容器格式

🛠️ 解决方案：
1. 使用 FFmpeg 转换为 H.264 格式
2. 在线视频转换工具
3. 使用 VLC 等播放器转换格式`;
    
    console.info(suggestion);
  }
  
  // 辅助函数：提取文件名，支持 Windows 和 Unix 路径
  function extractFileName(filePath) {
    if (!filePath) return '';
    // 支持 Windows (\\) 和 Unix (/) 路径分隔符
    return filePath.split(/[\/\\]/).pop();
  }
  
  // 初始化应用
  await initializeApp();
  
  // 初始化收藏功能
  setupFavoriteFeature();
  
  // 监听数据库就绪信号（如果存在的话）
  if (isElectron && window.electronAPI && window.electronAPI.onDatabaseReady) {
    window.electronAPI.onDatabaseReady(() => {
      console.log('收到数据库就绪信号，重新加载收藏数据');
      // 数据库就绪后重新加载收藏数据
      loadFavoriteWords();
    });
  }
  
  async function initializeApp() {
    console.log('🚀 [初始化] 开始初始化应用...');
    console.log('🚀 [初始化] initializeApp函数被调用');
    console.log('🚀 [初始化] 运行环境:', {
      isElectron: isElectron,
      platform: isElectron ? window.platform?.platform : 'browser',
      userAgent: navigator.userAgent
    });
    
    // 检查视频编解码器支持
    if (typeof HTMLVideoElement !== 'undefined') {
      const video = document.createElement('video');
      console.log('🎥 [初始化] 视频编解码器支持检查:');
      const formats = [
        'video/mp4; codecs="avc1.42E01E"', // H.264 Baseline
        'video/mp4; codecs="avc1.64001E"', // H.264 High
        'video/mp4; codecs="hev1.1.6.L93.B0"', // H.265/HEVC
        'video/mp4; codecs="hvc1.1.6.L93.B0"', // H.265/HEVC
        'video/webm; codecs="vp8"',
        'video/webm; codecs="vp9"',
        'video/ogg; codecs="theora"'
      ];
      
      formats.forEach(format => {
        const support = video.canPlayType(format);
        console.log(`   ${format}: ${support || '不支持'}`);
      });
      
      // 特别检查 H.265 支持
      const h265Support = video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') || 
                          video.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"');
      if (!h265Support) {
        console.warn('⚠️ [初始化] 警告: 系统不支持 H.265/HEVC 编解码器');
      }
    }
    
    setupVideoHandlers();
    setupSubtitleHandlers();
    setupDictionaryHandlers();
    setupVideoEvents();
    setupKeyboardShortcuts();  // 添加快捷键支持
    setupAIServiceToggle();  // 添加AI服务切换
    setupWindowFocusHandler();  // 添加窗口焦点处理
    setupPlaybackProgress();  // 添加播放进度记忆功能
    setupSubtitleMemory();  // 添加字幕文件记忆功能
    setupVideoMemory();  // 添加视频文件记忆功能
    setupContextMenu();  // 添加右键菜单支持
    setupHomePage();  // 添加主页功能
    await setupApiConfig();  // 初始化API配置功能
    console.log('🚀 [初始化] 准备初始化语音合成功能...');
    await initializeSpeechSynthesis();  // 初始化语音合成功能
    console.log('🚀 [初始化] 语音合成功能初始化完成');
    setupDictionaryOverlay();  // 设置字典面板遮罩层
    setupCustomVideoControls();  // 初始化自定义视频控件
    // 收藏功能已在上方初始化
    
    // 初始化H.265解码器
    await initH265Decoder();
    
    // 初始化按钮状态
    updateToggleButton();
    
    // 初始化图标
    lucide.createIcons();
    
    // 应用启动时默认显示主页，让用户主动选择
    console.log('🚀 [初始化] 应用启动完成，显示主页');
    setTimeout(() => {
      console.log('🚀 [初始化] 延迟后显示主页');
      showHomePage();
    }, 1000);  // 延迟1秒执行，确保初始化完成
  }
  
  /**
   * 设置窗口焦点处理，确保应用恢复焦点时数据同步
   */
  function setupWindowFocusHandler() {
    // 监听窗口焦点事件，应用恢复焦点时同步收藏数据
    window.addEventListener('focus', async () => {
      console.log('应用恢复焦点，同步收藏数据');
      if (isElectron && window.electronAPI) {
        await forceSyncFavoriteState();
      }
    });
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        console.log('页面变为可见，同步收藏数据');
        if (isElectron && window.electronAPI) {
          // 稍微延迟，确保系统稳定后再同步
          setTimeout(() => {
            forceSyncFavoriteState();
          }, 500);
        }
      }
    });
  }
  
  // ==================== 视频处理 ====================
  
  function setupVideoHandlers() {
    // 拖拽处理
    setupDragAndDrop(elements.videoDropZone, handleVideoFile);
    
    // 文件选择处理
    elements.videoFileInput.addEventListener('change', async function() {
      if (this.files.length) {
        await handleVideoFile(this.files[0]);
      }
    });
  }
  
  function setupDragAndDrop(dropZone, handler) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        // 为拖拽区域添加样式
        dropZone.classList.add('dragover');
      }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
      }, false);
    });
    
    dropZone.addEventListener('drop', async function(e) {
      const files = e.dataTransfer.files;
      if (files.length) {
        const file = files[0];
        
        if (handler === handleVideoFile && file.type.startsWith('video/')) {
          await handler(file);
        } else if (handler === handleSubtitleFile) {
          // 检查是否为字幕文件
          const fileName = file.name.toLowerCase();
          if (fileName.endsWith('.srt') || fileName.endsWith('.vtt')) {
            await handler(file);
          } else {
            showNotification('请选择 .srt 或 .vtt 格式的字幕文件', 'error');
          }
        } else if (dropZone === elements.openNewVideo || dropZone === elements.homePage) {
          // 主页拖拽与视频文件
          if (file.type.startsWith('video/')) {
            await handler(file);
          } else {
            showNotification('请选择视频文件', 'error');
          }
        } else {
          await handler(file);
        }
      }
    }, false);
  }
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  async function handleVideoFile(file) {
    console.log('🎥 [视频加载] 开始处理视频文件:', typeof file === 'string' ? file : file.name);
    console.log('🎥 [视频加载] 文件类型:', typeof file);
    console.log('🎥 [视频加载] 是否Electron环境:', isElectron);
    let videoURL, fileName;
    
    // 清理之前加载的字幕轨道
    clearAllSubtitleTracks();
    
    // 切换到主内容页面
    showMainContent();
    
    // 检测 H.265 视频并尝试解码
    const fileNameToCheck = typeof file === 'string' ? file : file.name;
    if (isH265Video(fileNameToCheck)) {
      console.log('🎬 [H.265] 检测到 H.265 视频，尝试使用解码器处理');
      try {
        if (h265Decoder && h265Decoder.isSupported) {
          console.log('🎬 [H.265] 使用 H.265 解码器处理视频');
          const processedFile = await h265Decoder.decodeH265Video(file);
          if (processedFile && processedFile !== file) {
            console.log('🎬 [H.265] 解码成功，使用处理后的视频');
            file = processedFile;
          } else {
            console.log('🎬 [H.265] 解码器返回原文件，继续使用原始加载流程');
          }
        } else {
          console.warn('⚠️ [H.265] 解码器不可用，尝试强制启用系统支持');
          await forceEnableH265Support();
        }
      } catch (error) {
        console.error('🚫 [H.265] 解码失败:', error);
        console.log('🎬 [H.265] 回退到标准播放流程');
      }
    }
    
    if (isElectron && typeof file === 'string') {
      // Electron环境下的文件路径处理
      videoURL = await window.electronAPI.getFileUrl(file);
      fileName = extractFileName(file); // 使用辅助函数提取文件名
      state.currentVideoFile = file;  // 使用完整路径作为标识
      document.title = fileName + ' - 视频字幕播放器';
      console.log('🎥 [视频加载] Electron环境，使用文件路径:', file);
      console.log('🎥 [视频加载] 生成的 URL:', videoURL);
    } else if (isElectron && typeof file === 'object' && file.path) {
      // Electron环境下的拖拽文件处理
      videoURL = await window.electronAPI.getFileUrl(file.path);
      fileName = file.name;
      state.currentVideoFile = file.path;  // 使用完整路径作为标识
      document.title = fileName + ' - 视频字幕播放器';
      console.log('🎥 [视频加载] Electron环境（拖拽），使用文件路径:', file.path);
      console.log('🎥 [视频加载] 生成的 URL:', videoURL);
    } else {
      // 浏览器环境或其他情况
      videoURL = URL.createObjectURL(file);
      fileName = file.name;
      state.currentVideoFile = file.name;  // 使用文件名作为标识
      document.title = fileName + ' - 视频字幕播放器';
      console.log('🎥 [视频加载] 浏览器环境，使用文件名:', file.name);
    }
    
    console.log('🎥 [视频加载] 加载视频文件:', state.currentVideoFile);
    
    // 保存最后打开的视频信息
    console.log('🎥 [视频加载] 保存最后打开的视频信息');
    saveLastOpenedVideo();
    
    // 设置视频源
    console.log('🎥 [视频加载] 设置视频源:', videoURL);
    elements.videoPlayer.src = videoURL;
    
    // 添加错误处理
    elements.videoPlayer.addEventListener('error', function(e) {
      console.error('🚫 [视频加载] 视频加载失败:', e);
      
      const error = e.target.error;
      let errorMessage = '视频加载失败';
      let detailedError = '';
      
      if (error) {
        switch(error.code) {
          case error.MEDIA_ERR_ABORTED:
            detailedError = '用户取消了视频加载';
            break;
          case error.MEDIA_ERR_NETWORK:
            detailedError = '网络错误导致视频下载失败';
            break;
          case error.MEDIA_ERR_DECODE:
            detailedError = '视频解码失败 - 可能是编解码器不支持该格式';
            errorMessage = '视频编解码器不支持该格式';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            detailedError = '视频格式不受支持';
            errorMessage = '视频格式不受支持，请尝试使用 H.264 编码的 MP4 文件';
            break;
          default:
            detailedError = '未知错误';
            break;
        }
      }
      
      console.error('🚫 [视频加载] 错误详情:', {
        error: error,
        errorCode: error ? error.code : 'unknown',
        errorMessage: detailedError,
        networkState: e.target.networkState,
        readyState: e.target.readyState,
        src: e.target.src
      });
      
      // 检查是否是 H.265 编码问题
      if (state.currentVideoFile && (state.currentVideoFile.includes('x265') || isH265Video(state.currentVideoFile))) {
        console.log('🎬 [H.265] 检测到H.265编码视频播放失败，尝试使用解码器');
        
        // 尝试使用H.265解码器
        if (h265Decoder && h265Decoder.isSupported) {
          try {
            console.log('🎬 [H.265] 尝试重新加载使用解码器');
            const originalFile = typeof file === 'string' ? file : file.name;
            h265Decoder.forceCompatibility(file).then(processedFile => {
              if (processedFile) {
                console.log('🎬 [H.265] 强制兼容性处理成功，重新设置视频源');
                elements.videoPlayer.src = URL.createObjectURL(processedFile);
              } else {
                console.log('🎬 [H.265] 解码器无法处理该文件类型');
              }
            }).catch(decodeError => {
              console.error('🚫 [H.265] 解码器处理失败:', decodeError);
            });
          } catch (decodeError) {
            console.error('🚫 [H.265] 解码器处理失败:', decodeError);
          }
        }
        
        errorMessage += '\n\n🎬 检测到该文件使用 x265(H.265) 编码';
        errorMessage += '\n\n🛠️ 解决方案：';
        errorMessage += '\n1. 在 Microsoft Store 搜索并安装 "HEVC 视频扩展"';
        errorMessage += '\n2. 在 Microsoft Store 搜索并安装 "AV1 视频扩展"';
        errorMessage += '\n3. 使用 FFmpeg 转换为 H.264 格式:';
        errorMessage += '\n   ffmpeg -i "输入.mp4" -c:v libx264 -crf 23 -c:a copy "输出.mp4"';
        errorMessage += '\n4. 尝试使用 x264 编码的相同视频';
        errorMessage += '\n\n📝 注意：应用已启用全部H.265支持参数，如果仍无法播放，请安装Windows系统的HEVC编解码器';
        
        // 显示更详细的建议
        setTimeout(() => {
          showMediaFormatSuggestion();
        }, 3000);
      } else {
        errorMessage += '\n\n请尝试使用 x264(H.264) 编码的 MP4 文件';
      }
      
      showNotification(errorMessage, 'error');
    }, { once: true });
    
    // 添加加载成功的日志
    elements.videoPlayer.addEventListener('loadstart', function() {
      console.log('🎥 [视频加载] 开始加载视频');
    }, { once: true });
    
    elements.videoPlayer.addEventListener('canplay', function() {
      console.log('🎥 [视频加载] 视频可以播放');
    }, { once: true });
    elements.uploadCard.style.display = 'none';
    elements.videoContainer.classList.add('active');
    
    // 动画效果
    elements.videoContainer.style.opacity = '0';
    elements.videoContainer.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      elements.videoContainer.style.transition = 'all 0.3s ease';
      elements.videoContainer.style.opacity = '1';
      elements.videoContainer.style.transform = 'translateY(0)';
    });
    
    // 在视频加载后恢复播放进度
    elements.videoPlayer.addEventListener('loadedmetadata', () => {
      console.log('🎥 [视频加载] 视频元数据加载完成，开始恢复播放进度和字幕');
      restorePlaybackProgress();
      restoreSubtitles();  // 恢复字幕文件
    }, { once: true });
  }
  
  function setupVideoEvents() {
    // 视频播放时更新字幕
    elements.videoPlayer.addEventListener('timeupdate', async () => {
      await updateSubtitleDisplay();
      // 保存播放进度（节流）
      savePlaybackProgress();
    });
    
    // 视频加载完成后初始化字幕轨道
    elements.videoPlayer.addEventListener('loadedmetadata', initializeTextTracks);
    
    // 监听视频结束事件
    elements.videoPlayer.addEventListener('ended', () => {
      console.log('视频播放结束，清除进度记录');
      clearPlaybackProgress();
    });
  }
  
  function initializeTextTracks() {
    if (elements.videoPlayer.textTracks) {
      Array.from(elements.videoPlayer.textTracks).forEach(track => {
        track.addEventListener('cuechange', async () => {
          await updateSubtitleDisplay();
        });
      });
    }
  }
  
  // ==================== 字幕处理 ====================
  
  function setupSubtitleHandlers() {
    // 字幕文件可以拖拽到整个应用窗口
    setupDragAndDrop(document.body, handleSubtitleFile);
    
    // 文件选择处理
    if (elements.subtitleFileInput) {
      elements.subtitleFileInput.addEventListener('change', function() {
        if (this.files.length) {
          handleSubtitleFile(this.files[0]);
        }
      });
    }
    
    // 字幕开关处理
    if (elements.subtitleToggleSwitch) {
      console.log('绑定Track字幕开关事件监听器');
      elements.subtitleToggleSwitch.addEventListener('click', function(event) {
        console.log('点击了Track字幕开关');
        event.preventDefault();
        toggleSubtitles();
      });
    } else {
      console.error('找不到 subtitleToggleSwitch 元素');
    }
    
    window.toggleSubtitles = toggleSubtitles;
    
    // 字幕区域鼠标事件已移除，因为独立字幕区域已删除
  }
  
  async function handleSubtitleFile(file) {
    console.log('开始处理字幕文件:', file);
    let fileName, fileContent;
    
    if (isElectron && typeof file === 'string') {
      fileName = file.split('/').pop();
      const result = await window.electronAPI.readFile(file);
      
      if (!result.success) {
        showNotification('读取字幕文件失败: ' + result.error, 'error');
        return;
      }
      
      fileContent = result.data;
    } else {
      fileName = file.name;
      console.log('读取浏览器文件:', fileName);
      try {
        fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        console.log('文件读取成功，内容长度:', fileContent.length);
      } catch (error) {
        console.error('读取文件失败:', error);
        showNotification('读取字幕文件失败', 'error');
        return;
      }
    }
    
    const fileExt = fileName.split('.').pop().toLowerCase();
    console.log('文件格式:', fileExt);
    
    if (fileExt === 'srt') {
      const vttContent = convertSrtToVtt(fileContent);
      addSubtitleTrack(fileName, vttContent);
      // 保存字幕内容到记忆中
      saveSubtitleAssociation(fileName, vttContent);
    } else if (fileExt === 'vtt') {
      addSubtitleTrack(fileName, fileContent);
      // 保存字幕内容到记忆中
      saveSubtitleAssociation(fileName, fileContent);
    } else {
      showNotification('不支持的字幕格式，请使用 .srt 或 .vtt 格式', 'error');
    }
  }
  
  function convertSrtToVtt(srtContent) {
    let vttContent = 'WEBVTT\n\n';
    const content = srtContent.replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4');
    const blocks = content.split(/\r?\n\r?\n/);
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block) continue;
      
      const lines = block.split(/\r?\n/);
      
      if (lines.length >= 2) {
        const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
        if (timeMatch) {
          vttContent += timeMatch[0] + '\n';
          for (let j = 2; j < lines.length; j++) {
            vttContent += lines[j] + '\n';
          }
          vttContent += '\n';
        }
      }
    }
    
    return vttContent;
  }
  
  function clearAllSubtitleTracks() {
    console.log('🧽 [字幕清理] 开始清理所有字幕轨道');
    
    // 清理已加载的字幕列表
    state.loadedSubtitles.forEach(subtitle => {
      if (subtitle.url) {
        URL.revokeObjectURL(subtitle.url);
      }
      if (subtitle.track && subtitle.track.parentNode) {
        subtitle.track.parentNode.removeChild(subtitle.track);
      }
    });
    
    // 清空已加载字幕数组
    state.loadedSubtitles = [];
    
    // 更新UI
    updateSubtitleList();
    
    console.log('🧽 [字幕清理] 清理完成');
  }

  function addSubtitleTrack(fileName, vttContent) {
    console.log('正在添加字幕轨道:', fileName);
    console.log('视频播放器是否存在:', !!elements.videoPlayer);
    
    if (!elements.videoPlayer) {
      console.error('视频播放器不存在，无法添加字幕轨道');
      showNotification('请先加载视频文件', 'error');
      return;
    }
    
    // 检查是否已存在相同名称的字幕轨道
    const existingSubtitle = state.loadedSubtitles.find(sub => sub.fileName === fileName);
    if (existingSubtitle) {
      console.log('字幕轨道已存在，跳过重复添加:', fileName);
      return;
    }
    
    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = fileName;
    track.srclang = 'en';
    track.src = url;
    // 默认隐藏Track字幕，只显示可交互字幕
    track.mode = 'hidden';
    
    elements.videoPlayer.appendChild(track);
    console.log('字幕轨道已添加到视频播放器');
    
    // 添加到已加载列表
    const subtitleInfo = { fileName, track, url };
    state.loadedSubtitles.push(subtitleInfo);
    
    // 在下一个事件循环中强制设置模式，确保浏览器已经处理完轨道
    setTimeout(() => {
      console.log('🔄 [字幕初始化] 强制设置字幕轨道模式');
      // 直接通过 textTracks 访问并设置模式
      const textTracks = elements.videoPlayer.textTracks;
      for (let i = 0; i < textTracks.length; i++) {
        const textTrack = textTracks[i];
        if (textTrack.label === fileName) {
          console.log('🔄 [字幕初始化] 找到轨道:', fileName, '当前模式:', textTrack.mode);
          // 默认隐藏Track字幕，只显示可交互字幕
          textTrack.mode = state.subtitlesVisible ? 'showing' : 'hidden';
          console.log('🔄 [字幕初始化] 设置轨道模式为:', textTrack.mode);
          // 设置事件监听
          textTrack.addEventListener('cuechange', async () => {
            await updateSubtitleDisplay();
          });
          break;
        }
      }
    }, 100);
    
    // 更新UI
    updateSubtitleList();
    console.log('准备显示通知:', `字幕文件 "${fileName}" 已加载`);
    showNotification(`字幕文件 "${fileName}" 已加载`, 'success');
  }
  
  function updateSubtitleList() {
    // 检查元素是否存在，如果不存在则跳过更新
    if (!elements.subtitleList || !elements.subtitleItems) {
      console.log('字幕列表元素不存在，跳过UI更新');
      return;
    }
    
    if (state.loadedSubtitles.length === 0) {
      elements.subtitleList.style.display = 'none';
      return;
    }
    
    elements.subtitleList.style.display = 'block';
    elements.subtitleItems.innerHTML = '';
    
    state.loadedSubtitles.forEach((subtitle, index) => {
      const item = document.createElement('div');
      item.className = 'subtitle-item';
      
      item.innerHTML = `
        <span class="subtitle-name">${subtitle.fileName}</span>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-ghost" onclick="toggleSubtitleTrack(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
            ${subtitle.track.mode === 'showing' ? '隐藏' : '显示'}
          </button>
          <button class="btn btn-ghost" onclick="removeSubtitleTrack(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: hsl(var(--destructive));">
            删除
          </button>
        </div>
      `;
      
      elements.subtitleItems.appendChild(item);
    });
  }
  
  function toggleSubtitles() {
    console.log('执行 toggleSubtitles 函数，当前状态:', state.subtitlesVisible);
    state.subtitlesVisible = !state.subtitlesVisible;
    console.log('切换后状态:', state.subtitlesVisible);
    
    if (elements.videoPlayer.textTracks) {
      console.log('找到', elements.videoPlayer.textTracks.length, '个字幕轨道');
      Array.from(elements.videoPlayer.textTracks).forEach((track, index) => {
        const oldMode = track.mode;
        track.mode = state.subtitlesVisible ? 'showing' : 'hidden';
        console.log(`轨道 ${index} 模式从 ${oldMode} 改为 ${track.mode}`);
      });
    } else {
      console.log('没有找到字幕轨道');
    }
    
    updateToggleButton();
    updateSubtitleList();
  }
  
  function updateToggleButton() {
    if (elements.subtitleToggleSwitch) {
      elements.subtitleToggleSwitch.setAttribute('data-enabled', state.subtitlesVisible.toString());
      elements.subtitleToggleSwitch.title = state.subtitlesVisible ? '隐藏Track字幕' : '显示Track字幕';
    }
  }
  

  async function updateSubtitleDisplay() {
    let hasActiveText = false;
    
    if (elements.videoPlayer.textTracks) {
      for (let i = 0; i < elements.videoPlayer.textTracks.length; i++) {
        const track = elements.videoPlayer.textTracks[i];
        // 始终显示字幕文本，不受track.mode影响
        if (track.activeCues && track.activeCues.length > 0) {
          const cueText = Array.from(track.activeCues)
            .map(cue => cue.text)
            .join('\n');
          await renderInteractiveSubtitle(cueText);
          hasActiveText = true;
          break;
        }
      }
    }
    
    // 在没有字幕显示时的处理逻辑
    if (!hasActiveText) {
      // 隐藏字幕覆盖层，避免显示空的黑色区域
      if (elements.videoSubtitleOverlay) {
        elements.videoSubtitleOverlay.style.display = 'none';
      }
      if (elements.videoSubtitleContent) {
        elements.videoSubtitleContent.innerHTML = '';
      }
    }
  }
  
  async function renderInteractiveSubtitle(text) {
    state.currentSubtitleContext = text;
    console.log('渲染字幕，当前收藏单词数量:', state.favoriteWords.size);
    
    // 只在视频内部显示字幕
    if (elements.videoSubtitleOverlay && elements.videoSubtitleContent) {
      renderSubtitleToContainer(text, elements.videoSubtitleContent, createVideoClickableWord);
      elements.videoSubtitleOverlay.style.display = 'flex';
    } else if (elements.videoSubtitleOverlay) {
      elements.videoSubtitleOverlay.style.display = 'none';
    }
  }
  
  // 通用字幕渲染函数
  function renderSubtitleToContainer(text, container, wordCreatorFunc) {
    // 简单的英文单词分割
    const words = text.split(/(\s+|[^\w\s])/);
    const containerElement = document.createElement('div');
    containerElement.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.3; padding: 0 0.5rem;';
    
    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'max-width: 100%; line-height: 1.3; word-wrap: break-word;';
    
    // 处理每个单词（异步）
    for (const word of words) {
      if (/^[a-zA-Z]+$/.test(word)) {
        wordCreatorFunc(word, textContainer);
      } else {
        textContainer.appendChild(document.createTextNode(word));
      }
    }
    
    containerElement.appendChild(textContainer);
    container.innerHTML = '';
    container.appendChild(containerElement);
  }
  
  // 创建可点击的单词元素（用于外部字幕显示）
  function createClickableWord(word, container) {
    const wordElement = document.createElement('span');
    wordElement.className = 'subtitle-word';
    wordElement.textContent = word;
    
    // 检查单词是否已收藏（大小写不敏感）
    const isFavorited = Array.from(state.favoriteWords).some(favWord => favWord.toLowerCase() === word.toLowerCase());
    if (isFavorited) {
      wordElement.classList.add('favorited-word');
      console.log(`字幕中发现已收藏单词: ${word}`);
    }
    
    // 鼠标悬停暂停
    wordElement.addEventListener('mouseenter', handleWordHover);
    wordElement.addEventListener('mouseleave', handleWordLeave);
    
    // 点击查词（清除悬停暂停的定时器）
    wordElement.addEventListener('click', () => {
      // 清除悬停暂停的定时器，防止冲突
      if (state.hoverPauseTimeout) {
        clearTimeout(state.hoverPauseTimeout);
        state.hoverPauseTimeout = null;
      }
      state.wasPlayingBeforeHover = false;
      
      lookupWord(word);
    });
    
    container.appendChild(wordElement);
  }
  
  // 创建可点击的单词元素（用于视频内字幕显示）
  function createVideoClickableWord(word, container) {
    const wordElement = document.createElement('span');
    wordElement.className = 'subtitle-word';
    wordElement.textContent = word;
    wordElement.title = `单击查词: ${word}`;
    
    // 检查单词是否已收藏（大小写不敏感）
    const isFavorited = Array.from(state.favoriteWords).some(favWord => favWord.toLowerCase() === word.toLowerCase());
    if (isFavorited) {
      wordElement.classList.add('favorited-word');
    }
    
    // 鼠标悬停暂停
    wordElement.addEventListener('mouseenter', handleWordHover);
    wordElement.addEventListener('mouseleave', handleWordLeave);
    
    // 点击查词（阻止事件冒泡到视频元素）
    wordElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // 阻止事件冒泡到视频元素
      
      // 清除悬停暂停的定时器，防止冲突
      if (state.hoverPauseTimeout) {
        clearTimeout(state.hoverPauseTimeout);
        state.hoverPauseTimeout = null;
      }
      state.wasPlayingBeforeHover = false;
      
      lookupWord(word);
    });
    
    container.appendChild(wordElement);
  }
  
  function handleWordHover() {
    if (!elements.videoPlayer.paused) {
      state.wasPlayingBeforeHover = true;
      elements.videoPlayer.pause();
    }
    
    if (state.hoverPauseTimeout) {
      clearTimeout(state.hoverPauseTimeout);
    }
  }
  
  function handleWordLeave() {
    if (state.wasPlayingBeforeHover) {
      state.hoverPauseTimeout = setTimeout(() => {
        elements.videoPlayer.play();
        state.wasPlayingBeforeHover = false;
      }, 50);
    }
  }
  
  // handleSubtitleMouseLeave函数已移除，因为独立字幕区域已删除
  
  // ==================== 快捷键功能 ====================
  
  // 防抖变量，防止快捷键重复触发
  let lastKeyPressTime = 0;
  const KEY_DEBOUNCE_DELAY = 200; // 200ms防抖
  
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyboardShortcut);
  }
  
  function handleKeyboardShortcut(event) {
    // 如果正在输入框中输入，忽略大部分快捷键（但允许复制粘贴）
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      // 在输入框中允许复制粘贴快捷键
      return;
    }
    
    // 检查是否有选中的文本
    const hasSelection = window.getSelection().toString().length > 0;
    
    // 处理复制快捷键
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      if (hasSelection) {
        // 有选中文本时，允许浏览器默认复制行为
        console.log('复制选中的文本');
        return; // 不阻止默认行为
      }
    }
    
    // 处理全选快捷键
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      // 只在可选择的元素上允许全选
      const target = event.target;
      const isSelectableElement = 
        target.classList.contains('dictionary-content') ||
        target.classList.contains('subtitle-display') ||
        target.classList.contains('word-result') ||
        target.closest('.dictionary-content') ||
        target.closest('.subtitle-display') ||
        target.closest('.word-result');
        
      if (isSelectableElement) {
        console.log('允许在可选择元素上全选');
        return; // 不阻止默认行为
      }
    }
    
    // 视频播放控制快捷键
    const key = event.key || event.keyCode;
    
    // 对视频控制快捷键添加防抖
    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === ' ' || key === 'Space') {
      const currentTime = Date.now();
      if (currentTime - lastKeyPressTime < KEY_DEBOUNCE_DELAY) {
        console.log('快捷键被防抖处理忽略');
        return; // 防抖，忽略过于频繁的按键
      }
      lastKeyPressTime = currentTime;
    }
    
    switch (key) {
      case ' ':  // 空格键 - 播放/暂停
      case 'Space':
        event.preventDefault();
        togglePlayPause();
        break;
        
      case 'ArrowLeft':  // 左箭头 - 后退3秒
        event.preventDefault();
        skipBackward();
        break;
        
      case 'ArrowRight':  // 右箭头 - 前进3秒
        event.preventDefault();
        skipForward();
        break;
        

    }
  }
  
  function togglePlayPause() {
    if (!elements.videoPlayer || !elements.videoPlayer.src) {
      return;
    }
    
    if (elements.videoPlayer.paused) {
      elements.videoPlayer.play();
      showNotification('播放', 'info');
    } else {
      elements.videoPlayer.pause();
      showNotification('暂停', 'info');
    }
  }
  
  function skipBackward() {
    if (!elements.videoPlayer || !elements.videoPlayer.src) {
      return;
    }
    
    const currentTime = elements.videoPlayer.currentTime;
    const newTime = Math.max(0, currentTime - 3);
    elements.videoPlayer.currentTime = newTime;
    
    showNotification('后退 3 秒', 'info');
  }
  
  function skipForward() {
    if (!elements.videoPlayer || !elements.videoPlayer.src) {
      return;
    }
    
    const currentTime = elements.videoPlayer.currentTime;
    const duration = elements.videoPlayer.duration || 0;
    const newTime = Math.min(duration, currentTime + 3);
    elements.videoPlayer.currentTime = newTime;
    
    showNotification('前进 3 秒', 'info');
  }
  

  
  // ==================== AI服务切换 ====================
  
  function setupAIServiceToggle() {
    const aiServiceToggle = document.getElementById('aiServiceToggle');
    const aiServiceName = document.getElementById('aiServiceName');
    
    if (aiServiceToggle) {
      aiServiceToggle.addEventListener('click', toggleAIService);
    }
    
    // 初始化显示
    updateAIServiceDisplay();
    
    // 设置翻译服务切换
    setupTranslationServiceToggle();
    
    // 设置主题切换
    setupThemeToggle();
  }
  
  function setupTranslationServiceToggle() {
    const translationServiceToggle = document.getElementById('translationServiceToggle');
    
    if (translationServiceToggle) {
      translationServiceToggle.addEventListener('click', toggleTranslationService);
    }
    
    // 初始化显示
    updateTranslationServiceDisplay();
  }
  
  function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }
    
    // 初始化主题
    initializeTheme();
  }
  
  function initializeTheme() {
    // 从localStorage读取主题设置
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
  }
  
  function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    applyTheme(newTheme);
    
    showNotification(`切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`, 'info');
  }
  
  function applyTheme(theme) {
    const html = document.documentElement;
    const themeIconLight = document.querySelector('.theme-icon-light');
    const themeIconDark = document.querySelector('.theme-icon-dark');
    
    if (theme === 'dark') {
      html.classList.add('dark');
      // 深色模式显示太阳图标（点击后切换到浅色）
      if (themeIconLight) themeIconLight.style.display = 'block';
      if (themeIconDark) themeIconDark.style.display = 'none';
    } else {
      html.classList.remove('dark');
      // 浅色模式显示月亮图标（点击后切换到深色）
      if (themeIconLight) themeIconLight.style.display = 'none';
      if (themeIconDark) themeIconDark.style.display = 'block';
    }
    
    // 保存到 localStorage
    localStorage.setItem('theme', theme);
  }
  
  function toggleAIService() {
    state.selectedAIService = state.selectedAIService === 'deepseek' ? 'zhipu' : 'deepseek';
    updateAIServiceDisplay();
    
    const serviceName = state.selectedAIService === 'deepseek' ? 'Deepseek' : '智谱AI';
    showNotification(`切换到 ${serviceName}`, 'info');
  }
  
  function updateAIServiceDisplay() {
    const aiServiceName = document.getElementById('aiServiceName');
    if (aiServiceName) {
      aiServiceName.textContent = state.selectedAIService === 'deepseek' ? 'Deepseek' : '智谱AI';
    }
  }
  
  function toggleTranslationService() {
    state.selectedTranslationService = state.selectedTranslationService === 'google' ? 'deepl' : 'google';
    updateTranslationServiceDisplay();
    
    const serviceName = state.selectedTranslationService === 'google' ? '谷歌翻译' : 'DeepL翻译';
    showNotification(`切换到 ${serviceName}`, 'info');
    
    // 如果当前有单词在显示，只重新翻译，不重新获取AI解释
    if (state.currentWord && elements.dictionaryResult.style.display !== 'none') {
      retranslateCurrentWord();
    }
  }
  
  // 只重新翻译当前单词，不重新获取AI解释
  async function retranslateCurrentWord() {
    if (!state.currentWord) return;
    
    try {
      // 根据选择的翻译服务获取翻译，如果失败则尝试备选服务
      let translation;
      try {
        translation = state.selectedTranslationService === 'deepl' 
          ? await getDeepLTranslation(state.currentWord)
          : await getGoogleTranslation(state.currentWord);
      } catch (primaryError) {
        console.warn('主要翻译服务失败，尝试备选服务:', primaryError.message);
        
        // 尝试备选翻译服务
        try {
          if (state.selectedTranslationService === 'deepl') {
            // 如果DeepL失败，尝试Google翻译
            if (API_CONFIG.GOOGLE_TRANSLATE_KEY && userApiConfig.translation?.google?.enabled) {
              translation = await getGoogleTranslation(state.currentWord);
              console.log('使用Google翻译作为备选服务');
              showNotification('DeepL翻译暂时不可用，已自动切换到Google翻译', 'info');
            } else {
              throw primaryError; // 如果Google翻译也不可用，抛出原始错误
            }
          } else {
            // 如果Google翻译失败，尝试DeepL
            if (API_CONFIG.DEEPL_API_KEY && userApiConfig.translation?.deepl?.enabled) {
              translation = await getDeepLTranslation(state.currentWord);
              console.log('使用DeepL翻译作为备选服务');
              showNotification('Google翻译暂时不可用，已自动切换到DeepL翻译', 'info');
            } else {
              throw primaryError; // 如果DeepL也不可用，抛出原始错误
            }
          }
        } catch (fallbackError) {
          console.error('备选翻译服务也失败:', fallbackError.message);
          throw new Error(`翻译失败: ${primaryError.message}`);
        }
      }
      
      // 只更新翻译部分的显示
      updateTranslationDisplay(state.currentWord, translation);
      
    } catch (error) {
      console.error('重新翻译失败:', error);
      showNotification('翻译失败，请重试', 'error');
    }
  }
  
  // 更新翻译显示部分
  function updateTranslationDisplay(word, translation) {
    const wordTitle = document.getElementById('wordTitle');
    const wordDefinitions = document.getElementById('wordDefinitions');
    
    // 设置单词标题
    if (wordTitle) {
      wordTitle.textContent = word;
    }
    
    // 设置翻译结果
    if (wordDefinitions && translation) {
      // 清空现有内容
      wordDefinitions.innerHTML = '';
      
      // 添加名词释义
      const nounDiv = document.createElement('div');
      nounDiv.className = 'definition-group';
      nounDiv.innerHTML = `
        <span class="part-of-speech">n.</span>
        <div class="definition-text">${translation}</div>
      `;
      wordDefinitions.appendChild(nounDiv);
    }
  }
  
  function updateTranslationServiceDisplay() {
    const translationServiceName = document.getElementById('translationServiceName');
    if (translationServiceName) {
      translationServiceName.textContent = state.selectedTranslationService === 'google' ? '谷歌翻译' : 'DeepL翻译';
    }
  }

  // ==================== 词典功能 ====================
  
  function setupDictionaryHandlers() {
    elements.closeDictionaryBtn.addEventListener('click', closeDictionary);
  }
  
  // ==================== 收藏功能 ====================
  
  function setupFavoriteFeature() {
    console.log('初始化收藏功能...');
    
    if (isElectron && window.electronAPI) {
      // Electron环境下使用SQLite数据库初始化收藏功能
      initializeFavoriteDatabase();
    } else {
      // 浏览器环境下的替代方案
      console.log('浏览器环境，跳过数据库初始化');
      state.favoriteWords = new Set();
    }
  }
  
  async function initializeFavoriteDatabase() {
    try {
      // 先初始化数据库
      console.log('初始化收藏数据库...');
      const initResult = await window.electronAPI.initFavoriteDatabase();
      
      if (initResult.success) {
        console.log('数据库初始化成功:', initResult.path, '模式:', initResult.mode);
      } else {
        console.error('数据库初始化失败:', initResult.error);
      }
      
      // 无论初始化是否成功，都尝试加载数据
      await loadFavoriteWords();
    } catch (error) {
      console.error('初始化收藏数据库错误:', error);
      // 如果初始化失败，仍然尝试加载数据
      await loadFavoriteWords();
    }
  }
  
  async function setupFavoriteButton() {
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
      favoriteBtn.addEventListener('click', handleFavoriteClick);
      updateFavoriteButtonState();
    }
  }
  
  async function handleFavoriteClick() {
    const word = state.currentWord;
    if (!word) {
      showNotification('没有可收藏的单词', 'error');
      return;
    }
    
    console.log(`点击收藏按钮，当前单词: ${word}`);
    
    // 检查单词是否已收藏（大小写不敏感）
    const isCurrentlyFavorited = Array.from(state.favoriteWords).some(favWord => favWord.toLowerCase() === word.toLowerCase());
    console.log(`当前收藏状态: ${isCurrentlyFavorited}`);
    
    if (isCurrentlyFavorited) {
      // 取消收藏
      console.log(`执行取消收藏操作: ${word}`);
      const removeResult = await window.electronAPI.removeFavoriteWord(word);
      console.log(`取消收藏结果:`, removeResult);
      if (removeResult.success) {
        // 从数据集中删除对应的单词（大小写不敏感）
        state.favoriteWords.forEach(favWord => {
          if (favWord.toLowerCase() === word.toLowerCase()) {
            state.favoriteWords.delete(favWord);
          }
        });
        console.log(`从state中删除单词: ${word}，当前Set大小: ${state.favoriteWords.size}`);
        updateFavoriteButtonState();
        // 刷新字幕显示以更新高亮状态
        await refreshSubtitleHighlight();
        // 更新单词本信息
        updateWordBookInfo();
        showNotification(`已取消收藏: ${word}`, 'info');
      } else {
        showNotification(`取消收藏失败: ${removeResult.error}`, 'error');
      }
    } else {
      // 添加收藏 - 收集完整的单词信息
      console.log(`执行添加收藏操作: ${word}`);
      
      // 收集完整的单词信息
      const wordData = {
        word: word,
        pronunciation: getPronunciationFromDOM(),
        translation: getTranslationFromDOM(),
        ai_explanation: getAIExplanationFromDOM(),
        example_sentence: state.currentSubtitleContext || '',
        sentence_translation: getSentenceTranslationFromDOM(),
        screenshot: captureVideoScreenshot() // 添加视频截图
      };
      
      console.log('收集到的完整单词信息:', wordData);
      
      const saveResult = await window.electronAPI.saveFavoriteWord(wordData);
      console.log(`添加收藏结果:`, saveResult);
      if (saveResult.success) {
        state.favoriteWords.add(word);
        console.log(`添加单词到state: ${word}，当前Set大小: ${state.favoriteWords.size}`);
        updateFavoriteButtonState();
        // 刷新字幕显示以更新高亮状态
        await refreshSubtitleHighlight();
        // 更新单词本信息
        updateWordBookInfo();
        showNotification(`收藏成功: ${word}`, 'success');
      } else {
        if (saveResult.error.includes('已存在')) {
          state.favoriteWords.add(word);
          updateFavoriteButtonState();
          // 刷新字幕显示以更新高亮状态
          await refreshSubtitleHighlight();
          // 更新单词本信息
          updateWordBookInfo();
          showNotification('单词已在收藏列表中', 'info');
        } else {
          showNotification(`收藏失败: ${saveResult.error}`, 'error');
        }
      }
    }
  }
  
  // 从DOM中获取发音信息
  function getPronunciationFromDOM() {
    const phoneticElement = document.getElementById('wordPhonetic');
    return phoneticElement ? phoneticElement.textContent.trim() : '';
  }
  
  // 从DOM中获取翻译信息
  function getTranslationFromDOM() {
    const definitionsElement = document.getElementById('wordDefinitions');
    if (!definitionsElement) return '';
    
    // 提取所有翻译内容
    const definitionTexts = definitionsElement.querySelectorAll('.definition-text');
    const translations = Array.from(definitionTexts).map(el => el.textContent.trim());
    return translations.join('；');
  }
  
  // 捕获当前视频截图
  function captureVideoScreenshot() {
    if (!elements.videoPlayer || !elements.videoPlayer.src || elements.videoPlayer.readyState < 2) {
      console.log('视频未准备好，无法截图');
      return null;
    }
    
    try {
      // 创建canvas元素
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 设置canvas尺寸为视频尺寸
      canvas.width = elements.videoPlayer.videoWidth;
      canvas.height = elements.videoPlayer.videoHeight;
      
      // 将当前视频帧绘制到canvas
      ctx.drawImage(elements.videoPlayer, 0, 0, canvas.width, canvas.height);
      
      // 转换为base64格式的图片数据
      const screenshotData = canvas.toDataURL('image/jpeg', 0.8);
      
      console.log('视频截图捕获成功，尺寸:', canvas.width + 'x' + canvas.height);
      return screenshotData;
    } catch (error) {
      console.error('视频截图捕获失败:', error);
      return null;
    }
  }
  
  // 从DOM中获取AI语境解释
  function getAIExplanationFromDOM() {
    const contextElement = document.getElementById('contextExplanation');
    return contextElement ? contextElement.textContent.trim() : '';
  }
  
  // 从DOM中获取整句翻译
  function getSentenceTranslationFromDOM() {
    const sentenceElement = document.getElementById('sentenceTranslation');
    return sentenceElement ? sentenceElement.textContent.trim() : '';
  }

  /**
   * 刷新字幕中已收藏单词的高亮状态
   */
  async function refreshSubtitleHighlight() {
    if (state.currentSubtitleContext) {
      console.log('刷新字幕高亮状态');
      await renderInteractiveSubtitle(state.currentSubtitleContext);
    }
  }
  
  /**
   * 强制同步收藏状态，确保数据一致性
   */
  async function forceSyncFavoriteState() {
    if (!isElectron || !window.electronAPI) {
      return;
    }
    
    try {
      console.log('强制同步收藏状态...');
      const result = await window.electronAPI.loadFavoriteWords();
      if (result.success) {
        const oldSize = state.favoriteWords.size;
        state.favoriteWords = new Set(result.words);
        console.log(`同步完成，收藏单词数量从 ${oldSize} 变为 ${state.favoriteWords.size}`);
        
        // 更新UI状态
        if (state.currentWord) {
          updateFavoriteButtonState();
        }
        if (state.currentSubtitleContext) {
          await refreshSubtitleHighlight();
        }
      }
    } catch (error) {
      console.error('强制同步收藏状态失败:', error);
    }
  }
  
  async function loadFavoriteWords(retryCount = 0) {
    const maxRetries = 3;
    try {
      console.log(`加载收藏单词（第${retryCount + 1}次尝试）...`);
      const result = await window.electronAPI.loadFavoriteWords();
        
      if (result.success) {
        // 保持数据库中的原始单词，不转换大小写
        const previousSize = state.favoriteWords.size;
        state.favoriteWords = new Set(result.words);
        console.log(`从数据库加载 ${result.words.length} 个收藏单词:`, result.words);
        console.log('数据库路径:', await window.electronAPI.getDatabasePath());
        console.log('state.favoriteWords 内容:', Array.from(state.favoriteWords));
        
        // 如果数据有变化或是初次加载，更新UI状态
        if (previousSize !== state.favoriteWords.size || previousSize === 0) {
          console.log('收藏数据有变化，更新UI状态');
          
          // 如果当前有单词在查询，更新按钮状态
          if (state.currentWord) {
            updateFavoriteButtonState();
          }
            
          // 刷新字幕显示
          if (state.currentSubtitleContext) {
            await refreshSubtitleHighlight();
          }
        }
      } else {
        console.error('加载收藏单词失败:', result.error);
          
        // 如果加载失败且还有重试次数，稍后重试
        if (retryCount < maxRetries) {
          console.log(`将在1秒后重试...`);
          setTimeout(() => {
            loadFavoriteWords(retryCount + 1);
          }, 1000);
        } else {
          console.error('达到最大重试次数，停止加载收藏数据');
        }
      }
    } catch (error) {
      console.error('加载收藏单词异常:', error);
        
      // 如果发生异常且还有重试次数，稍后重试
      if (retryCount < maxRetries) {
        console.log(`将在1秒后重试...`);
        setTimeout(() => {
          loadFavoriteWords(retryCount + 1);
        }, 1000);
      } else {
        console.error('达到最大重试次数，停止加载收藏数据');
      }
    }
  }
  
  function updateFavoriteButtonState() {
    const favoriteBtn = document.getElementById('favoriteBtn');
    const favoriteIcon = document.getElementById('favoriteIcon');
    
    console.log(`更新收藏按钮状态 - 当前单词: ${state.currentWord}`);
    
    // 检查是否已收藏（大小写不敏感）
    const isCurrentlyFavorited = Array.from(state.favoriteWords).some(favWord => favWord.toLowerCase() === state.currentWord.toLowerCase());
    console.log(`是否已收藏: ${isCurrentlyFavorited}`);
    console.log(`favoriteBtn存在: ${!!favoriteBtn}, favoriteIcon存在: ${!!favoriteIcon}`);
    
    if (favoriteBtn && favoriteIcon && state.currentWord) {
      if (isCurrentlyFavorited) {
        // 已收藏：红色实心爱心
        favoriteBtn.classList.add('favorited');
        favoriteIcon.innerHTML = '<path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
        favoriteIcon.setAttribute('fill', 'currentColor');
        favoriteIcon.setAttribute('stroke', 'none');
        console.log('设置为已收藏状态（红色）');
      } else {
        // 未收藏：灰色实心爱心
        favoriteBtn.classList.remove('favorited');
        favoriteIcon.innerHTML = '<path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
        favoriteIcon.setAttribute('fill', 'currentColor');
        favoriteIcon.setAttribute('stroke', 'none');
        console.log('设置为未收藏状态（灰色）');
      }
    } else {
      console.log('updateFavoriteButtonState 跳过：缺少必要元素或currentWord');
    }
  }
  
  async function lookupWord(word) {
    if (!word || !/^[a-zA-Z]+$/.test(word)) return;
    
    // 保存当前单词
    state.currentWord = word;
    
    // 查词时暂停视频，并记录播放状态
    if (elements.videoPlayer) {
      state.wasPlayingBeforeHover = !elements.videoPlayer.paused;
      if (!elements.videoPlayer.paused) {
        elements.videoPlayer.pause();
      }
    }
    
    // 显示字典面板和遮罩层
    elements.dictionaryPanel.classList.add('show');
    elements.dictionaryOverlay.classList.add('show');
    
    showDictionaryLoading();
    
    try {
      // 在查词时强制同步收藏状态，确保数据最新
      await forceSyncFavoriteState();
      
      // 根据选择的翻译服务获取翻译，如果失败则尝试备选服务
      let translation;
      try {
        translation = state.selectedTranslationService === 'deepl' 
          ? await getDeepLTranslation(word)
          : await getGoogleTranslation(word);
      } catch (primaryError) {
        console.warn('主要翻译服务失败，尝试备选服务:', primaryError.message);
        
        // 尝试备选翻译服务
        try {
          if (state.selectedTranslationService === 'deepl') {
            // 如果DeepL失败，尝试Google翻译
            if (API_CONFIG.GOOGLE_TRANSLATE_KEY && userApiConfig.translation?.google?.enabled) {
              translation = await getGoogleTranslation(word);
              console.log('使用Google翻译作为备选服务');
            } else {
              throw primaryError; // 如果Google翻译也不可用，抛出原始错误
            }
          } else {
            // 如果Google翻译失败，尝试DeepL
            if (API_CONFIG.DEEPL_API_KEY && userApiConfig.translation?.deepl?.enabled) {
              translation = await getDeepLTranslation(word);
              console.log('使用DeepL翻译作为备选服务');
            } else {
              throw primaryError; // 如果DeepL也不可用，抛出原始错误
            }
          }
        } catch (fallbackError) {
          console.error('备选翻译服务也失败:', fallbackError.message);
          throw new Error(`翻译失败: ${primaryError.message}`);
        }
      }
      displayWordResultQuick(word, translation);
      
      // 设置收藏按钮
      setupFavoriteButton();
      
      // 然后获取AI解释，流式显示
      await getAIExplanationStreaming(word);
      
    } catch (error) {
      console.error('查词失败:', error);
      showDictionaryError();
    }
  }
  
  // 关闭字典面板
  function closeDictionaryPanel() {
    elements.dictionaryPanel.classList.remove('show');
    elements.dictionaryOverlay.classList.remove('show');
    
    // 移除自动播放功能，用户需要手动播放
    // 关闭抽屉时不再自动播放视频
    
    // 重置悬停状态
    state.wasPlayingBeforeHover = false;
  }
  
  // 设置字典面板遮罩层
  function setupDictionaryOverlay() {
    // 点击遮罩层关闭字典面板
    if (elements.dictionaryOverlay) {
      elements.dictionaryOverlay.addEventListener('click', closeDictionaryPanel);
    }
    
    // 点击关闭按钮关闭字典面板
    if (elements.closeDictionaryBtn) {
      elements.closeDictionaryBtn.addEventListener('click', closeDictionaryPanel);
    }
  }
  
  function showDictionaryLoading() {
    elements.dictionaryEmpty.style.display = 'none';
    elements.dictionaryResult.style.display = 'none';
    elements.dictionaryError.style.display = 'none';
    elements.dictionaryLoading.style.display = 'block';
  }
  
  function showDictionaryError() {
    elements.dictionaryLoading.style.display = 'none';
    elements.dictionaryResult.style.display = 'none';
    elements.dictionaryEmpty.style.display = 'none';
    elements.dictionaryError.style.display = 'block';
  }
  
  function closeDictionary() {
    elements.dictionaryEmpty.style.display = 'block';
    elements.dictionaryResult.style.display = 'none';
    elements.dictionaryLoading.style.display = 'none';
    elements.dictionaryError.style.display = 'none';
  }
  
  async function getGoogleTranslation(word) {
    // 检查API密钥是否配置
    if (!API_CONFIG.GOOGLE_TRANSLATE_KEY) {
      throw new Error('Google翻译API密钥未配置，请在API配置中设置');
    }
    
    const url = `https://translation.googleapis.com/language/translate/v2?key=${API_CONFIG.GOOGLE_TRANSLATE_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: word,
        source: 'en',
        target: 'zh',
        format: 'text'
      })
    });
    
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Google翻译API密钥无效，请检查配置');
      }
      throw new Error(`Google翻译失败: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data.translations[0].translatedText;
  }
  
  async function getDeepLTranslation(word) {
    // 检查API密钥是否配置
    if (!API_CONFIG.DEEPL_API_KEY) {
      throw new Error('DeepL翻译API密钥未配置，请在API配置中设置');
    }
    
    const url = 'https://api-free.deepl.com/v2/translate';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${API_CONFIG.DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        text: word,
        source_lang: 'EN',
        target_lang: 'ZH'
      })
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('DeepL翻译API密钥无效，请检查配置');
      } else if (response.status === 429) {
        throw new Error('DeepL翻译请求过多，请稍后重试或切换到其他翻译服务');
      }
      throw new Error(`DeepL翻译失败: ${response.status}`);
    }
    
    const data = await response.json();
    return data.translations[0].text;
  }
  
  async function getAIExplanation(word) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `请用中文简洁回答以下两个问题：\n1. 单词"${word}"在句子"${state.currentSubtitleContext}"中的具体含义是什么？\n2. 请完整翻译这句话为中文。\n\n请直接回答，不需要额外解释。`
        }],
        stream: false,
        max_tokens: 200
      })
    });
    
    if (!response.ok) throw new Error('AI explanation failed');
    
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async function getAIExplanationStreaming(word) {
    if (state.selectedAIService === 'zhipu') {
      return getZhipuAIExplanationStreaming(word);
    } else {
      return getDeepseekAIExplanationStreaming(word);
    }
  }
  
  async function getDeepseekAIExplanationStreaming(word) {
    try {
      // 检查API密钥是否配置
      if (!API_CONFIG.DEEPSEEK_KEY) {
        throw new Error('DeepSeek AI API密钥未配置，请在API配置中设置');
      }
      
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.DEEPSEEK_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'user',
            content: `请用中文简洁回答以下两个问题：\n1. 单词"${word}"在句子"${state.currentSubtitleContext}"中的具体含义是什么？\n2. 请完整翻译这句话为中文。\n\n请直接回答，不需要额外解释。`
          }],
          stream: true,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('DeepSeek AI API密钥无效，请检查配置');
        }
        throw new Error(`DeepSeek AI请求失败: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let fullText = '';
      let isUpdating = false;
      
      const contextExplanation = document.getElementById('contextExplanation');
      const sentenceTranslation = document.getElementById('sentenceTranslation');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // 流结束，解析完整文本
              parseCompleteResponse(fullText, word, contextExplanation, sentenceTranslation);
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                fullText += content;
                
                // 防止过于频繁的更新
                if (!isUpdating) {
                  isUpdating = true;
                  setTimeout(() => {
                    parseCompleteResponse(fullText, word, contextExplanation, sentenceTranslation);
                    isUpdating = false;
                  }, 50); // 减少到50ms延迟，提高实时性
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
      // 确保最终解析
      parseCompleteResponse(fullText, word, contextExplanation, sentenceTranslation);
      
    } catch (error) {
      console.error('AI流式解释失败:', error);
      const contextExplanation = document.getElementById('contextExplanation');
      const sentenceTranslation = document.getElementById('sentenceTranslation');
      
      if (contextExplanation) {
        contextExplanation.textContent = 'AI解释获取失败';
      }
      if (sentenceTranslation) {
        sentenceTranslation.textContent = 'AI翻译获取失败';
      }
    }
  }
  
  function parseCompleteResponse(fullText, word, contextExplanation, sentenceTranslation) {
    if (!fullText || fullText.trim().length === 0) return;
    
    console.log('解析AI回复:', fullText); // 添加调试日志
    
    // 按行分割并清理
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let contextPart = [];
    let translationPart = [];
    let currentPart = 'context';
    let foundTransitionKeyword = false;
    
    for (const line of lines) {
      // 检测切换到翻译部分的关键词（更宽松的匹配）
      if (line.match(/^\s*2[．、.:]/) || 
          line.match(/^\s*第?二[、：.]/) ||
          line.match(/^\s*\d+[、.:]?\s*(请)?(完整)?(翻译|句子翻译|整句)/) ||
          (line.includes('翻译') && (line.includes('句子') || line.includes('整句') || line.includes('这句')) && currentPart === 'context' && contextPart.length > 0)) {
        currentPart = 'translation';
        foundTransitionKeyword = true;
        
        // 如果当前行包含数字开头，提取后面的内容
        let content = line
          .replace(/^\s*2[．、.:]\s*/, '')
          .replace(/^\s*第?二[、：.]\s*/, '')
          .replace(/^\s*\d+[、.:]?\s*(请)?(完整)?(翻译|句子翻译|整句)[：:.]?\s*/, '')
          .trim();
        
        if (content.length > 0) {
          translationPart.push(content);
        }
        continue;
      }
      
      // 分配到对应部分
      if (currentPart === 'context') {
        // 更宽松的第一部分内容清理
        let cleanLine = line
          .replace(/^\s*1[．、.:]\s*/, '')
          .replace(/^\s*第?一[、：.]\s*/, '')
          .replace(/^\s*\d+[、.:]?\s*/, '')
          .replace(/单词["\u201c].+?["\u201d]在.+?中的(具体)?(含义|意思)(是)?[:：.?]?\s*/, '')
          .replace(/^[:：.\s]+/, '')
          .trim();
        
        // 放宽长度限制
        if (cleanLine.length > 0) {
          contextPart.push(cleanLine);
        }
      } else {
        // 更宽松的第二部分内容清理
        let cleanLine = line
          .replace(/^\s*2[．、.:]\s*/, '')
          .replace(/^\s*第?二[、：.]\s*/, '')
          .replace(/(请)?(完整)?(翻译|句子翻译|整句)[：:.?]?\s*/, '')
          .replace(/^[:：.\s]+/, '')
          .trim();
        
        if (cleanLine.length > 0) {
          translationPart.push(cleanLine);
        }
      }
    }
    
    // 如果没有找到明确的分割标志，尝试智能分割
    if (!foundTransitionKeyword && lines.length > 1) {
      // 简单策略：前半部分作为语境解释，后半部分作为翻译
      const midPoint = Math.ceil(lines.length / 2);
      
      // 重新分配
      contextPart = [];
      translationPart = [];
      
      lines.slice(0, midPoint).forEach(line => {
        let cleanLine = line
          .replace(/^\s*\d+[．、.:]\s*/, '')
          .replace(/单词["\u201c].+?["\u201d]/, '')
          .replace(/在.+?中的/, '')
          .replace(/(具体)?(含义|意思)(是)?[:：.?]?\s*/, '')
          .trim();
        if (cleanLine.length > 0) {
          contextPart.push(cleanLine);
        }
      });
      
      lines.slice(midPoint).forEach(line => {
        let cleanLine = line
          .replace(/^\s*\d+[．、.:]\s*/, '')
          .replace(/(请)?(完整)?(翻译|句子翻译|整句)[：:.?]?\s*/, '')
          .trim();
        if (cleanLine.length > 0) {
          translationPart.push(cleanLine);
        }
      });
    }
    
    console.log('解析结果 - 语境:', contextPart, '翻译:', translationPart); // 调试日志
    
    // 更新显示
    if (contextExplanation) {
      const contextText = contextPart.join(' ').trim();
      if (contextText.length > 0) {
        contextExplanation.textContent = contextText;
      } else {
        // 如果没有解析到语境，显示原始文本的前一部分
        const fallbackText = fullText.split('\n')[0] || fullText.substring(0, 50);
        if (fallbackText.trim().length > 0) {
          contextExplanation.textContent = fallbackText.trim();
        }
      }
    }
    
    if (sentenceTranslation) {
      const translationText = translationPart.join(' ').trim();
      if (translationText.length > 0) {
        sentenceTranslation.textContent = translationText;
      } else if (contextPart.length > 0) {
        // 如果没有翻译部分但有语境内容，可能还在加载中
        sentenceTranslation.textContent = '正在获取整句翻译...';
      } else {
        // 如果都没有，显示原始文本的后一部分
        const lines = fullText.split('\n').filter(l => l.trim());
        const fallbackText = lines[lines.length - 1] || fullText.substring(50);
        if (fallbackText.trim().length > 0) {
          sentenceTranslation.textContent = fallbackText.trim();
        }
      }
    }
  }
  
  async function getZhipuAIExplanationStreaming(word) {
    try {
      // 检查API密钥是否配置
      if (!API_CONFIG.ZHIPU_KEY) {
        throw new Error('智谱AI API密钥未配置，请在API配置中设置');
      }
      
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.ZHIPU_KEY}`
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [{
            role: 'user',
            content: `请用中文简洁回答以下两个问题：\n1. 单词"${word}"在句子"${state.currentSubtitleContext}"中的具体含义是什么？\n2. 请完整翻译这句话为中文。\n\n请直接回答，不需要额外解释。`
          }],
          stream: true,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('智谱AI API密钥无效，请检查配置');
        }
        throw new Error(`智谱AI请求失败: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let fullText = '';
      let isUpdating = false;
      
      const contextExplanation = document.getElementById('contextExplanation');
      const sentenceTranslation = document.getElementById('sentenceTranslation');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // 流结束，解析完整文本
              parseCompleteResponse(fullText, word, contextExplanation, sentenceTranslation);
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                fullText += content;
                
                // 防止过于频繁的更新
                if (!isUpdating) {
                  isUpdating = true;
                  setTimeout(() => {
                    parseCompleteResponse(fullText, word, contextExplanation, sentenceTranslation);
                    isUpdating = false;
                  }, 50); // 减少到50ms延迟，提高实时性
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
      // 确保最终解析
      parseCompleteResponse(fullText, word, contextExplanation, sentenceTranslation);
      
    } catch (error) {
      console.error('智谱AI流式解释失败:', error);
      const contextExplanation = document.getElementById('contextExplanation');
      const sentenceTranslation = document.getElementById('sentenceTranslation');
      
      if (contextExplanation) {
        contextExplanation.textContent = 'AI解释获取失败';
      }
      if (sentenceTranslation) {
        sentenceTranslation.textContent = 'AI翻译获取失败';
      }
    }
  }
  
  function displayWordResultQuick(word, translation) {
    elements.dictionaryLoading.style.display = 'none';
    elements.dictionaryEmpty.style.display = 'none';
    elements.dictionaryError.style.display = 'none';
    elements.dictionaryResult.style.display = 'block';
    
    // 获取各个元素
    const wordTitle = document.getElementById('wordTitle');
    const wordPhonetic = document.getElementById('wordPhonetic');
    const wordDefinitions = document.getElementById('wordDefinitions');
    const contextExplanation = document.getElementById('contextExplanation');
    const sentenceTranslation = document.getElementById('sentenceTranslation');
    
    // 设置单词标题
    if (wordTitle) {
      wordTitle.textContent = word;
    }
    
    // 设置发音 (模拟数据) 并添加点击发音功能
    if (wordPhonetic) {
      wordPhonetic.textContent = `/${word.toLowerCase()}/`;
      // 添加点击发音功能
      setupPhoneticPronunciation(wordPhonetic, word);
    }
    
    // 设置谷歌翻译结果
    if (wordDefinitions && translation) {
      // 清空现有内容
      wordDefinitions.innerHTML = '';
      
      // 添加名词释义
      const nounDiv = document.createElement('div');
      nounDiv.className = 'definition-group';
      nounDiv.innerHTML = `
        <span class="part-of-speech">n.</span>
        <div class="definition-text">${translation}</div>
      `;
      wordDefinitions.appendChild(nounDiv);
    }
    
    // AI部分显示加载状态
    if (contextExplanation) {
      contextExplanation.textContent = '正在获取语境解释...';
    }
    if (sentenceTranslation) {
      sentenceTranslation.textContent = '正在获取整句翻译...';
    }
    
    // 重新初始化图标
    lucide.createIcons();
  }
  
  // ==================== 音标发音功能 ====================
  
  // 发音防抖状态
  let lastPronunciationTime = 0;
  const PRONUNCIATION_DEBOUNCE_DELAY = 300; // 300ms防抖
  
  /**
   * 为音标元素设置点击发音功能
   * @param {HTMLElement} phoneticElement - 音标元素
   * @param {string} word - 要发音的单词
   */
  function setupPhoneticPronunciation(phoneticElement, word) {
    if (!phoneticElement || !word) return;
    
    // 清除之前的事件监听器，防止重复绑定
    const newPhoneticElement = phoneticElement.cloneNode(true);
    phoneticElement.parentNode.replaceChild(newPhoneticElement, phoneticElement);
    
    // 添加样式，显示可点击状态
    newPhoneticElement.style.cursor = 'pointer';
    newPhoneticElement.style.transition = 'color 0.2s ease';
    newPhoneticElement.title = '点击发音';
    
    // 添加悬停效果
    newPhoneticElement.addEventListener('mouseenter', function() {
      newPhoneticElement.style.color = 'hsl(var(--primary))';
    });
    
    newPhoneticElement.addEventListener('mouseleave', function() {
      newPhoneticElement.style.color = '';
    });
    
    // 添加点击事件带防抖
    newPhoneticElement.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // 防抖处理
      const currentTime = Date.now();
      if (currentTime - lastPronunciationTime < PRONUNCIATION_DEBOUNCE_DELAY) {
        console.log('🔊 发音被防抖处理忽略');
        return;
      }
      lastPronunciationTime = currentTime;
      
      console.log('🔊 点击音标发音:', word);
      pronounceWord(word);
    });
  }
  
  /**
   * 语音合成发音单词 - 使用增强的原生TTS
   * @param {string} word - 要发音的单词
   */
  async function pronounceWord(word) {
    if (!word) return;
    
    try {
      // 使用增强的原生TTS功能
      await pronounceWithEnhancedTTS(word);
      
    } catch (error) {
      console.error('🔊 语音合成错误:', error);
      showNotification('发音功能出错，请重试', 'error');
    }
  }
  
  // ==================== Edge TTS 实现 ====================
  
  // Edge TTS 客户端实例
  let edgeTTSClient = null;
  let currentAudio = null; // 当前播放的音频
  
  /**
   * 初始化增强的语音合成功能
   * 使用优化的Web Speech API配置
   */
  async function initializeEnhancedTTS() {
    console.log('🔊 初始化增强语音合成功能...');
    
    try {
      // 检查浏览器是否支持语音合成
      if (!('speechSynthesis' in window)) {
        throw new Error('浏览器不支持语音合成功能');
      }
      
      // 等待语音列表加载
      await new Promise((resolve) => {
        const checkVoices = () => {
          const voices = speechSynthesis.getVoices();
          if (voices.length > 0) {
            resolve();
          } else {
            setTimeout(checkVoices, 100);
          }
        };
        
        if (speechSynthesis.getVoices().length > 0) {
          resolve();
        } else {
          speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
          checkVoices();
        }
      });
      
      // 获取并筛选高质量英语语音
      const voices = speechSynthesis.getVoices();
      const englishVoices = voices.filter(voice => 
        voice.lang.includes('en-US') || voice.lang.includes('en-GB')
      );
      
      console.log('🔊 可用英语语音数量:', englishVoices.length);
      
      // 选择最佳语音（优先选择神经网络语音或高质量语音）
      const preferredVoices = englishVoices.filter(voice => 
        voice.name.toLowerCase().includes('neural') ||
        voice.name.toLowerCase().includes('enhanced') ||
        voice.name.toLowerCase().includes('premium') ||
        voice.name.toLowerCase().includes('aria') ||
        voice.name.toLowerCase().includes('jenny') ||
        voice.name.toLowerCase().includes('guy')
      );
      
      if (preferredVoices.length > 0) {
        console.log('🔊 找到高质量语音:', preferredVoices[0].name);
        if (typeof showNotification === 'function') {
          showNotification(`语音合成已就绪 (${preferredVoices[0].name})`, 'success');
        }
      } else {
        console.log('🔊 使用标准语音:', englishVoices[0]?.name || '默认语音');
        if (typeof showNotification === 'function') {
          showNotification('语音合成已就绪 (标准语音)', 'success');
        }
      }
      
      return true;
    } catch (error) {
      console.error('🔊 语音合成初始化失败:', error);
      if (typeof showNotification === 'function') {
        showNotification(`语音合成初始化失败: ${error.message}`, 'error');
      }
      return false;
    }
  }
  
  /**
   * 使用增强的TTS发音
   * @param {string} word - 要发音的单词
   */
  async function pronounceWithEnhancedTTS(word) {
    return new Promise((resolve, reject) => {
      try {
        // 检查浏览器是否支持语音合成
        if (!('speechSynthesis' in window)) {
          showNotification('您的浏览器不支持语音功能', 'error');
          reject(new Error('不支持语音合成'));
          return;
        }
        
        // 停止当前正在播放的语音（防止冲突）
        if (speechSynthesis.speaking || speechSynthesis.pending) {
          console.log('🔊 停止之前的发音，开始新的发音');
          speechSynthesis.cancel();
          
          // 等待一小段时间确保取消完成
          setTimeout(() => {
            startEnhancedPronunciation(word, resolve, reject);
          }, 100);
        } else {
          startEnhancedPronunciation(word, resolve, reject);
        }
        
      } catch (error) {
        console.error('🔊 增强语音合成错误:', error);
        showNotification('发音功能出错，请重试', 'error');
        reject(error);
      }
    });
  }
  
  /**
   * 开始增强的语音合成
   * @param {string} word - 要发音的单词
   * @param {Function} resolve - Promise resolve
   * @param {Function} reject - Promise reject
   */
  function startEnhancedPronunciation(word, resolve, reject) {
    // 创建语音合成实例
    const utterance = new SpeechSynthesisUtterance(word);
    
    // 配置语音参数
    utterance.lang = 'en-US'; // 设置为美式英语
    utterance.rate = 0.8;     // 语速稍慢，便于学习
    utterance.pitch = 1.0;    // 正常音调
    utterance.volume = 0.9;   // 稍高音量
    
    // 获取并选择最佳语音
    const voices = speechSynthesis.getVoices();
    const englishVoices = voices.filter(voice => 
      voice.lang.includes('en-US') || voice.lang.includes('en-GB')
    );
    
    if (englishVoices.length > 0) {
      // 优先选择高质量语音
      const preferredVoices = englishVoices.filter(voice => 
        voice.name.toLowerCase().includes('neural') ||
        voice.name.toLowerCase().includes('enhanced') ||
        voice.name.toLowerCase().includes('premium') ||
        voice.name.toLowerCase().includes('aria') ||
        voice.name.toLowerCase().includes('jenny') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('alex')
      );
      
      utterance.voice = preferredVoices.length > 0 ? preferredVoices[0] : englishVoices[0];
      console.log('🔊 使用语音:', utterance.voice.name);
    }
    
    // 添加事件监听器
    utterance.onstart = function() {
      console.log('🔊 开始增强TTS发音:', word);
      // 添加视觉反馈
      const phoneticElement = document.getElementById('wordPhonetic');
      if (phoneticElement) {
        phoneticElement.style.color = 'hsl(var(--primary))';
        phoneticElement.style.fontWeight = 'bold';
      }
    };
    
    utterance.onend = function() {
      console.log('🔊 增强TTS发音结束:', word);
      // 恢复音标样式
      const phoneticElement = document.getElementById('wordPhonetic');
      if (phoneticElement) {
        phoneticElement.style.color = '';
        phoneticElement.style.fontWeight = '';
      }
      resolve();
    };
    
    utterance.onerror = function(e) {
      console.error('🔊 增强TTS发音失败:', e);
      
      // 检查错误类型，如果是中断或取消错误（用户快速切换发音），不显示错误提示
      if (e.error === 'interrupted' || e.error === 'canceled') {
        console.log('🔊 发音被中断或取消（用户切换到其他发音）');
      } else {
        showNotification('发音失败，请重试', 'error');
      }
      
      // 恢复音标样式
      const phoneticElement = document.getElementById('wordPhonetic');
      if (phoneticElement) {
        phoneticElement.style.color = '';
        phoneticElement.style.fontWeight = '';
      }
      
      reject(e);
    };
    
    // 开始语音合成
    speechSynthesis.speak(utterance);
    
    // 显示成功提示
    showNotification(`🔊 正在发音: ${word}`, 'info');
  }
  
  /**
   * 使用原生TTS发音（回退方案）
   * @param {string} word - 要发音的单词
   */
  async function pronounceWithNativeTTS(word) {
    return new Promise((resolve, reject) => {
      try {
        // 检查浏览器是否支持语音合成
        if (!('speechSynthesis' in window)) {
          showNotification('您的浏览器不支持语音功能', 'error');
          reject(new Error('不支持语音合成'));
          return;
        }
        
        // 停止当前正在播放的语音（防止冲突）
        if (speechSynthesis.speaking || speechSynthesis.pending) {
          console.log('🔊 停止之前的发音，开始新的发音');
          speechSynthesis.cancel();
          
          // 等待一小段时间确保取消完成
          setTimeout(() => {
            startNativePronunciation(word, resolve, reject);
          }, 100);
        } else {
          startNativePronunciation(word, resolve, reject);
        }
        
      } catch (error) {
        console.error('🔊 原生语音合成错误:', error);
        showNotification('发音功能出错，请重试', 'error');
        reject(error);
      }
    });
  }
  
  /**
   * 开始原生语音合成
   * @param {string} word - 要发音的单词
   * @param {Function} resolve - Promise resolve
   * @param {Function} reject - Promise reject
   */
  function startNativePronunciation(word, resolve, reject) {
    // 创建语音合成实例
    const utterance = new SpeechSynthesisUtterance(word);
    
    // 配置语音参数
    utterance.lang = 'en-US'; // 设置为美式英语
    utterance.rate = 0.8;     // 语速稍慢，便于学习
    utterance.pitch = 1.0;    // 正常音调
    utterance.volume = 0.8;   // 音量
    
    // 尝试选择更好的语音引擎
    const voices = speechSynthesis.getVoices();
    const preferredVoices = voices.filter(voice => 
      voice.lang.includes('en-US') || voice.lang.includes('en')
    );
    
    if (preferredVoices.length > 0) {
      // 优先选择美式英语女声
      const femaleVoice = preferredVoices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('alice')
      );
      
      utterance.voice = femaleVoice || preferredVoices[0];
    }
    
    // 添加事件监听器
    utterance.onstart = function() {
      console.log('🔊 开始原生TTS发音:', word);
      // 可以在这里添加视觉反馈，比如高亮音标
      const phoneticElement = document.getElementById('wordPhonetic');
      if (phoneticElement) {
        phoneticElement.style.color = 'hsl(var(--primary))';
        phoneticElement.style.fontWeight = 'bold';
      }
    };
    
    utterance.onend = function() {
      console.log('🔊 原生TTS发音结束:', word);
      // 恢复音标样式
      const phoneticElement = document.getElementById('wordPhonetic');
      if (phoneticElement) {
        phoneticElement.style.color = '';
        phoneticElement.style.fontWeight = '';
      }
      resolve();
    };
    
    utterance.onerror = function(e) {
      console.error('🔊 原生TTS发音失败:', e);
      
      // 检查错误类型，如果是中断或取消错误（用户快速切换发音），不显示错误提示
      if (e.error === 'interrupted' || e.error === 'canceled') {
        console.log('🔊 发音被中断或取消（用户切换到其他发音）');
        // 不显示错误提示，这是正常的用户行为
      } else {
        // 只有真正的错误才显示提示
        showNotification('发音失败，请重试', 'error');
      }
      
      // 恢复音标样式
      const phoneticElement = document.getElementById('wordPhonetic');
      if (phoneticElement) {
        phoneticElement.style.color = '';
        phoneticElement.style.fontWeight = '';
      }
      
      reject(e);
    };
    
    // 开始语音合成
    speechSynthesis.speak(utterance);
    
    // 显示成功提示
    showNotification(`🔊 正在发音: ${word} (原生TTS)`);
  }
  
  /**
   * 初始化语音合成功能
   */
  async function initializeSpeechSynthesis() {
    console.log('🔊 初始化语音合成功能...');
    // 添加通知确认函数被调用
    if (typeof showNotification === 'function') {
      showNotification('正在初始化语音合成功能...', 'info');
    }
    
    try {
      // 使用增强的语音合成功能
      const success = await initializeEnhancedTTS();
      
      if (success) {
        console.log('🔊 语音合成功能已初始化');
      } else {
        console.log('🔊 语音合成初始化失败，但系统仍可使用基本功能');
      }
      
    } catch (error) {
      console.error('🔊 语音合成初始化失败:', error);
      if (typeof showNotification === 'function') {
        showNotification(`语音合成初始化失败: ${error.message}`, 'error');
      }
    }
  }

  // ==================== 全局函数 ====================
  
  window.toggleSubtitleTrack = function(index) {
    const subtitle = state.loadedSubtitles[index];
    if (subtitle) {
      subtitle.track.mode = subtitle.track.mode === 'showing' ? 'hidden' : 'showing';
      updateSubtitleList();
    }
  };
  
  window.removeSubtitleTrack = function(index) {
    const subtitle = state.loadedSubtitles[index];
    if (subtitle) {
      elements.videoPlayer.removeChild(subtitle.track);
      URL.revokeObjectURL(subtitle.url);
      
      // 从字幕记忆中移除
      if (state.currentVideoFile && state.videoSubtitles.has(state.currentVideoFile)) {
        const videoSubtitles = state.videoSubtitles.get(state.currentVideoFile);
        const filteredSubtitles = videoSubtitles.filter(sub => sub.fileName !== subtitle.fileName);
        
        if (filteredSubtitles.length > 0) {
          state.videoSubtitles.set(state.currentVideoFile, filteredSubtitles);
        } else {
          state.videoSubtitles.delete(state.currentVideoFile);
        }
        persistSubtitleMemory();
      }
      
      state.loadedSubtitles.splice(index, 1);
      updateSubtitleList();
      showNotification('字幕已删除', 'success');
    }
  };
  
  function showNotification(message, type = 'info') {
    console.log('显示通知:', message, '类型:', type);
    // 简单的通知实现
    const notification = document.createElement('div');
    
    // 特殊样式的快捷键通知
    const isShortcutNotification = ['播放', '暂停', '后退 3 秒', '前进 3 秒'].includes(message);
    
    if (isShortcutNotification) {
      // 获取视频容器的位置
      const videoContainer = elements.videoContainer;
      let containerRect = { top: 0, left: 0, width: 0, height: 0 };
      
      if (videoContainer && videoContainer.style.display !== 'none') {
        containerRect = videoContainer.getBoundingClientRect();
      } else {
        // 如果视频容器不可见，使用上传卡片的位置
        const uploadCard = elements.uploadCard;
        if (uploadCard) {
          containerRect = uploadCard.getBoundingClientRect();
        }
      }
      
      notification.style.cssText = `
        position: fixed;
        top: ${containerRect.top + containerRect.height / 2}px;
        left: ${containerRect.left + containerRect.width / 2}px;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: var(--radius);
        font-size: 1.125rem;
        font-weight: 600;
        z-index: 2000;
        animation: fadeInOut 1s ease;
        pointer-events: none;
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      `;
    } else {
      // 所有其他通知都显示在窗口顶部中间
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 2000;
        animation: topCenterSlideIn 0.3s ease;
        pointer-events: none;
        backdrop-filter: blur(10px);
      `;
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 字幕加载成功提示2秒消失，其他3秒消失
    const isSubtitleLoadNotification = message.includes('已加载') && type === 'success';
    const duration = isShortcutNotification ? 1000 : (isSubtitleLoadNotification ? 2000 : 3000);
    const animationOut = isShortcutNotification ? '' : 'topCenterSlideOut 0.3s ease forwards';
    
    setTimeout(() => {
      if (animationOut) {
        notification.style.animation = animationOut;
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      } else {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }
    }, duration);
  }
  
  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes topCenterSlideIn {
      from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes topCenterSlideOut {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
  `;
  document.head.appendChild(style);
  
  // ==================== 播放进度记忆功能 ====================
  
  function setupPlaybackProgress() {
    console.log('🎬 [播放进度] 初始化播放进度记忆功能');
    
    // 加载存储的播放进度
    loadPlaybackProgress();
    
    // 监听窗口关闭事件，保存进度
    window.addEventListener('beforeunload', () => {
      console.log('🎬 [播放进度] 监听到窗口关闭事件');
      if (state.currentVideoFile && elements.videoPlayer.currentTime > 0) {
        console.log('🎬 [播放进度] 保存播放进度:', state.currentVideoFile, elements.videoPlayer.currentTime);
        savePlaybackProgress();
      }
    });
    
    // 如果是Electron环境，监听应用关闭事件
    if (isElectron && window.electronAPI && window.electronAPI.onAppClosing) {
      window.electronAPI.onAppClosing(() => {
        console.log('🎬 [播放进度] 监听到应用关闭事件');
        if (state.currentVideoFile && elements.videoPlayer.currentTime > 0) {
          console.log('🎬 [播放进度] 保存播放进度:', state.currentVideoFile, elements.videoPlayer.currentTime);
          savePlaybackProgress();
        }
      });
    }
  }
  
  function loadPlaybackProgress() {
    console.log('🎬 [播放进度] 开始加载播放进度数据');
    try {
      const saved = localStorage.getItem('videoPlaybackProgress');
      console.log('🎬 [播放进度] localStorage中的数据:', saved ? '存在' : '不存在');
      if (saved) {
        const progressData = JSON.parse(saved);
        // 转换为Map格式
        state.playbackProgress = new Map(Object.entries(progressData));
        console.log('🎬 [播放进度] 加载已保存的播放进度:', state.playbackProgress.size, '个视频');
        // 打印所有视频的进度信息
        state.playbackProgress.forEach((info, videoFile) => {
          console.log('🎬 [播放进度] 视频:', videoFile, '进度:', Math.floor(info.currentTime), '秒');
        });
      }
    } catch (error) {
      console.error('🚫 [播放进度] 加载播放进度失败:', error);
      state.playbackProgress = new Map();
    }
  }
  
  function savePlaybackProgress() {
    if (!state.currentVideoFile || !elements.videoPlayer.src) {
      return;
    }
    
    const currentTime = elements.videoPlayer.currentTime;
    const duration = elements.videoPlayer.duration;
    
    // 只在有效时间范围内保存，且不是接近结尾的位置
    if (currentTime > 5 && duration > 0 && currentTime < duration - 10) {
      const progressInfo = {
        currentTime: currentTime,
        duration: duration,
        lastWatched: new Date().toISOString(),
        fileName: state.currentVideoFile
      };
      
      state.playbackProgress.set(state.currentVideoFile, progressInfo);
      
      // 节流保存到localStorage（每5秒保存一次）
      if (!savePlaybackProgress.lastSave || Date.now() - savePlaybackProgress.lastSave > 5000) {
        persistPlaybackProgress();
        savePlaybackProgress.lastSave = Date.now();
      }
    }
  }
  
  function persistPlaybackProgress() {
    try {
      // 转换Map为普通对象进行存储
      const progressObj = Object.fromEntries(state.playbackProgress);
      localStorage.setItem('videoPlaybackProgress', JSON.stringify(progressObj));
      console.log('播放进度已保存');
    } catch (error) {
      console.error('保存播放进度失败:', error);
    }
  }
  
  function restorePlaybackProgress() {
    console.log('🎬 [播放进度] 尝试恢复播放进度, 当前视频:', state.currentVideoFile);
    if (!state.currentVideoFile || !state.playbackProgress.has(state.currentVideoFile)) {
      console.log('🎬 [播放进度] 没有找到之前的播放进度');
      return;
    }
    
    const progressInfo = state.playbackProgress.get(state.currentVideoFile);
    const { currentTime, duration, lastWatched } = progressInfo;
    console.log('🎬 [播放进度] 找到进度信息:', {
      currentTime,
      duration,
      lastWatched,
      videoDuration: elements.videoPlayer.duration
    });
    
    // 检查进度是否有效
    if (currentTime > 5 && currentTime < elements.videoPlayer.duration - 10) {
      console.log('🎬 [播放进度] 进度有效，恢复播放位置:', Math.floor(currentTime / 60) + ':' + Math.floor(currentTime % 60).toString().padStart(2, '0'));
      
      // 设置播放位置
      elements.videoPlayer.currentTime = currentTime;
      
      // 等待视频加载完成后自动开始播放
      const handleCanPlay = () => {
        console.log('🎬 [播放进度] 视频可以播放，自动开始播放');
        elements.videoPlayer.play().then(() => {
          console.log('🎬 [播放进度] 自动播放成功');
        }).catch(error => {
          console.error('🚫 [播放进度] 自动播放失败:', error);
          // 如果自动播放失败（浏览器的自动播放策略），显示提示
          showNotification('请手动点击播放按钮开始观看', 'info');
        });
      };
      
      // 添加事件监听器，在视频准备好后自动播放
      elements.videoPlayer.addEventListener('canplay', handleCanPlay, { once: true });
      
      // 如果视频已经准备好，立即执行
      if (elements.videoPlayer.readyState >= 3) { // HAVE_FUTURE_DATA
        setTimeout(handleCanPlay, 500); // 稍微延迟以确保位置已设置
      }
      
      // 显示友好的提示
      const timeStr = formatTime(currentTime);
      const lastWatchedStr = new Date(lastWatched).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      showNotification(`继续上次观看 (${timeStr}) - ${lastWatchedStr}`, 'info');
    } else {
      console.log('🎬 [播放进度] 进度无效，跳过恢复');
    }
  }
  
  function clearPlaybackProgress() {
    if (state.currentVideoFile && state.playbackProgress.has(state.currentVideoFile)) {
      state.playbackProgress.delete(state.currentVideoFile);
      persistPlaybackProgress();
      console.log('清除视频播放进度:', state.currentVideoFile);
    }
  }
  
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  // 暴露全局函数供调试使用
  window.debugPlaybackProgress = () => {
    console.log('当前视频:', state.currentVideoFile);
    console.log('所有进度记录:', state.playbackProgress);
    console.log('当前位置:', elements.videoPlayer.currentTime);
  };
  
  window.debugSubtitleMemory = () => {
    console.log('当前视频:', state.currentVideoFile);
    console.log('所有字幕记录:', state.videoSubtitles);
    console.log('当前已加载字幕:', state.loadedSubtitles);
  };
  
  // 新增 localStorage 调试功能
  window.debugLocalStorage = () => {
    console.log('=== localStorage 调试信息 ===');
    const saved = localStorage.getItem('videoSubtitleAssociations');
    console.log('原始 localStorage 数据:', saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('解析后的数据:', parsed);
        Object.entries(parsed).forEach(([videoFile, subtitles]) => {
          console.log(`视频: ${videoFile}`);
          subtitles.forEach((sub, index) => {
            console.log(`  ${index + 1}. ${sub.fileName} - 有内容: ${!!sub.content} (长度: ${sub.content ? sub.content.length : 0})`);
            if (sub.content) {
              console.log(`     内容预览: ${sub.content.substring(0, 100)}...`);
            }
          });
        });
      } catch (e) {
        console.error('解析 localStorage 数据失败:', e);
      }
    } else {
      console.log('localStorage 中没有字幕数据');
    }
  };
  
  // 清空 localStorage 调试功能
  window.clearSubtitleLocalStorage = () => {
    localStorage.removeItem('videoSubtitleAssociations');
    state.videoSubtitles = new Map();
    console.log('已清空字幕 localStorage 数据');
  };
  
  window.debugVideoMemory = () => {
    console.log('最后打开的视频:', state.lastOpenedVideo);
    console.log('当前视频:', state.currentVideoFile);
  };
  
  // ==================== 字幕文件记忆功能 ====================
  
  function setupSubtitleMemory() {
    console.log('📝 [字幕记忆] 初始化字幕记忆功能');
    
    // 加载存储的字幕关联
    loadSubtitleMemory();
    
    // 监听窗口关闭事件，保存字幕关联
    window.addEventListener('beforeunload', () => {
      console.log('📝 [字幕记忆] 监听到窗口关闭事件');
      // 不需要在这里保存，因为已经在 handleSubtitleFile 中实时保存了
      // if (state.currentVideoFile && state.loadedSubtitles.length > 0) {
      //   console.log('📝 [字幕记忆] 保存字幕关联:', state.currentVideoFile, state.loadedSubtitles.length);
      //   saveAllSubtitleAssociations();
      // }
    });
  }
  
  function loadSubtitleMemory() {
    console.log('📝 [字幕记忆] 开始加载字幕记忆数据');
    try {
      const saved = localStorage.getItem('videoSubtitleAssociations');
      console.log('📝 [字幕记忆] localStorage中的数据:', saved ? '存在' : '不存在');
      console.log('📝 [字幕记忆] localStorage原始数据:', saved ? saved.substring(0, 500) + '...' : 'null');
      if (saved) {
        const subtitleData = JSON.parse(saved);
        console.log('📝 [字幕记忆] 解析后的数据类型:', typeof subtitleData);
        console.log('📝 [字幕记忆] 解析后的数据结构:', subtitleData);
        // 转换为Map格式
        state.videoSubtitles = new Map(Object.entries(subtitleData));
        console.log('📝 [字幕记忆] 加载已保存的字幕关联:', state.videoSubtitles.size, '个视频');
        // 打印所有视频的字幕信息
        state.videoSubtitles.forEach((subtitles, videoFile) => {
          console.log('📝 [字幕记忆] 视频:', videoFile, '字幕数量:', subtitles.length);
          subtitles.forEach((sub, index) => {
            console.log(`  - ${index + 1}: ${sub.fileName}, 有内容: ${!!sub.content}, 内容长度: ${sub.content ? sub.content.length : 0}`);
          });
        });
      }
    } catch (error) {
      console.error('🚫 [字幕记忆] 加载字幕记忆失败:', error);
      state.videoSubtitles = new Map();
    }
  }
  
  function saveSubtitleAssociation(fileName, vttContent) {
    console.log('📝 [字幕记忆] 开始保存字幕关联:', fileName, '内容长度:', vttContent ? vttContent.length : 0);
    console.log('📝 [字幕记忆] 内容预览:', vttContent ? vttContent.substring(0, 100) + '...' : 'null');
    if (!state.currentVideoFile) {
      console.log('📝 [字幕记忆] 没有当前视频文件，跳过保存字幕关联');
      return;
    }
    
    // 获取当前视频的字幕列表
    let videoSubtitles = state.videoSubtitles.get(state.currentVideoFile) || [];
    console.log('📝 [字幕记忆] 当前视频已有字幕数量:', videoSubtitles.length);
    
    // 检查是否已存在相同名称的字幕
    const existingIndex = videoSubtitles.findIndex(sub => sub.fileName === fileName);
    
    const subtitleInfo = {
      fileName: fileName,
      content: vttContent,
      addedTime: new Date().toISOString(),
      isElectron: isElectron
    };
    
    console.log('📝 [字幕记忆] 创建的subtitleInfo对象:', {
      fileName: subtitleInfo.fileName,
      contentLength: subtitleInfo.content ? subtitleInfo.content.length : 0,
      hasContent: !!subtitleInfo.content,
      addedTime: subtitleInfo.addedTime,
      isElectron: subtitleInfo.isElectron
    });
    
    if (existingIndex >= 0) {
      // 替换已存在的字幕
      videoSubtitles[existingIndex] = subtitleInfo;
      console.log('📝 [字幕记忆] 更新字幕关联:', fileName);
    } else {
      // 添加新字幕
      videoSubtitles.push(subtitleInfo);
      console.log('📝 [字幕记忆] 添加新字幕关联:', fileName);
    }
    
    state.videoSubtitles.set(state.currentVideoFile, videoSubtitles);
    console.log('📝 [字幕记忆] 字幕关联已更新，总数:', videoSubtitles.length);
    
    // 打印当前视频的所有字幕信息
    console.log('📝 [字幕记忆] 当前视频所有字幕:');
    videoSubtitles.forEach((sub, index) => {
      console.log(`  ${index + 1}. ${sub.fileName} - 有内容: ${!!sub.content} (长度: ${sub.content ? sub.content.length : 0})`);
    });
    
    // 立即持久化存储
    persistSubtitleMemory();
  }
  
  function saveAllSubtitleAssociations() {
    if (!state.currentVideoFile || state.loadedSubtitles.length === 0) {
      return;
    }
    
    console.log('保存当前视频的所有字幕关联');
    
    // 清理当前视频的旧字幕记录
    const currentSubtitles = [];
    
    state.loadedSubtitles.forEach(subtitle => {
      // 需要获取字幕内容，但这里无法直接获取原始内容
      // 所以只保存文件名，在restoreSubtitles时提示用户重新加载
      currentSubtitles.push({
        fileName: subtitle.fileName,
        content: null, // 无法获取内容
        addedTime: new Date().toISOString(),
        isElectron: isElectron
      });
    });
    
    if (currentSubtitles.length > 0) {
      state.videoSubtitles.set(state.currentVideoFile, currentSubtitles);
      persistSubtitleMemory();
    }
  }
  
  function persistSubtitleMemory() {
    try {
      console.log('📝 [字幕记忆] 开始持久化存储字幕记忆');
      
      // 打印当前state.videoSubtitles的内容
      console.log('📝 [字幕记忆] 当前 state.videoSubtitles 大小:', state.videoSubtitles.size);
      state.videoSubtitles.forEach((subtitles, videoFile) => {
        console.log(`📝 [字幕记忆] 视频: ${videoFile}`);
        subtitles.forEach((sub, index) => {
          console.log(`  ${index + 1}. ${sub.fileName} - 有内容: ${!!sub.content} (长度: ${sub.content ? sub.content.length : 0})`);
        });
      });
      
      // 转换Map为普通对象进行存储
      const subtitleObj = Object.fromEntries(state.videoSubtitles);
      console.log('📝 [字幕记忆] 转换后的数据结构:', subtitleObj);
      
      const jsonString = JSON.stringify(subtitleObj);
      console.log('📝 [字幕记忆] JSON字符串长度:', jsonString.length);
      console.log('📝 [字幕记忆] JSON字符串预览:', jsonString.substring(0, 200) + '...');
      
      localStorage.setItem('videoSubtitleAssociations', jsonString);
      console.log('📝 [字幕记忆] 字幕关联已保存到localStorage');
      
      // 验证保存结果
      const savedData = localStorage.getItem('videoSubtitleAssociations');
      console.log('📝 [字幕记忆] 保存验证 - localStorage中的数据长度:', savedData ? savedData.length : 0);
    } catch (error) {
      console.error('🚫 [字幕记忆] 保存字幕记忆失败:', error);
    }
  }
  
  function restoreSubtitles() {
    console.log('📝 [字幕记忆] 开始尝试恢复字幕文件, 当前视频:', state.currentVideoFile);
    if (!state.currentVideoFile || !state.videoSubtitles.has(state.currentVideoFile)) {
      console.log('📝 [字幕记忆] 没有找到之前的字幕关联');
      return;
    }
    
    const videoSubtitles = state.videoSubtitles.get(state.currentVideoFile);
    console.log(`📝 [字幕记忆] 找到 ${videoSubtitles.length} 个关联的字幕文件`);
    
    let restoredCount = 0;
    let needManualLoadCount = 0;
    
    videoSubtitles.forEach(subtitleInfo => {
      console.log('📝 [字幕记忆] 处理字幕:', subtitleInfo.fileName, '有内容:', !!subtitleInfo.content);
      if (subtitleInfo.content) {
        // 有存储的内容，直接恢复
        try {
          addSubtitleTrack(subtitleInfo.fileName, subtitleInfo.content);
          restoredCount++;
          console.log('📝 [字幕记忆] 恢复字幕成功:', subtitleInfo.fileName);
        } catch (error) {
          console.error('🚫 [字幕记忆] 恢复字幕失败:', subtitleInfo.fileName, error);
          needManualLoadCount++;
        }
      } else {
        // 没有存储的内容，需要手动重新加载
        console.log('📝 [字幕记忆] 字幕没有内容，需要手动加载:', subtitleInfo.fileName);
        needManualLoadCount++;
      }
    });
    
    // 显示恢复结果
    console.log('📝 [字幕记忆] 恢复结果 - 成功:', restoredCount, '需要手动:', needManualLoadCount);
    if (restoredCount > 0) {
      showNotification(`恢复了 ${restoredCount} 个字幕文件`, 'success');
    }
    
    if (needManualLoadCount > 0) {
      const fileNames = videoSubtitles
        .filter(sub => !sub.content)
        .map(sub => sub.fileName)
        .join('、');
      
      setTimeout(() => {
        showNotification(`请重新加载字幕: ${fileNames}`, 'info');
      }, 2000);
    }
  }
  
  function clearSubtitleMemory() {
    if (state.currentVideoFile && state.videoSubtitles.has(state.currentVideoFile)) {
      state.videoSubtitles.delete(state.currentVideoFile);
      persistSubtitleMemory();
      console.log('清除视频字幕关联:', state.currentVideoFile);
    }
  }
  
  // ==================== 视频文件记忆功能 ====================
  
  function setupVideoMemory() {
    console.log('🎥 [视频记忆] 初始化视频记忆功能');
    
    // 加载存储的最后打开的视频
    loadLastOpenedVideo();
    
    // 监听窗口关闭事件，保存最后打开的视频
    window.addEventListener('beforeunload', () => {
      console.log('🎥 [视频记忆] 监听到窗口关闭事件');
      if (state.currentVideoFile) {
        console.log('🎥 [视频记忆] 保存最后打开的视频:', state.currentVideoFile);
        saveLastOpenedVideo();
      }
    });
  }
  
  function loadLastOpenedVideo() {
    console.log('🎥 [视频记忆] 开始加载最后打开的视频数据');
    try {
      const saved = localStorage.getItem('lastOpenedVideo');
      console.log('🎥 [视频记忆] localStorage中的数据:', saved ? '存在' : '不存在');
      if (saved) {
        state.lastOpenedVideo = JSON.parse(saved);
        console.log('🎥 [视频记忆] 加载最后打开的视频:', state.lastOpenedVideo);
      }
    } catch (error) {
      console.error('🚫 [视频记忆] 加载最后打开的视频失败:', error);
      state.lastOpenedVideo = null;
    }
  }
  
  function saveLastOpenedVideo() {
    console.log('🎥 [视频记忆] === 开始保存最后打开的视频 ===');
    console.log('🎥 [视频记忆] 当前视频文件:', state.currentVideoFile);
    console.log('🎥 [视频记忆] currentVideoFile类型:', typeof state.currentVideoFile);
    console.log('🎥 [视频记忆] currentVideoFile长度:', state.currentVideoFile ? state.currentVideoFile.length : 0);
    
    if (!state.currentVideoFile) {
      console.log('🚫 [视频记忆] 没有当前视频文件，跳过保存');
      return;
    }
    
    const videoInfo = {
      filePath: state.currentVideoFile,
      fileName: isElectron ? extractFileName(state.currentVideoFile) : state.currentVideoFile,
      timestamp: new Date().toISOString(),
      isElectron: isElectron
    };
    
    console.log('🎥 [视频记忆] 创建视频信息对象:', JSON.stringify(videoInfo, null, 2));
    
    state.lastOpenedVideo = videoInfo;
    console.log('🎥 [视频记忆] 已设置 state.lastOpenedVideo');
    
    try {
      console.log('🎥 [视频记忆] 准备保存到 localStorage...');
      const jsonData = JSON.stringify(videoInfo);
      console.log('🎥 [视频记忆] JSON数据:', jsonData);
      
      localStorage.setItem('lastOpenedVideo', jsonData);
      console.log('🎥 [视频记忆] ✅ localStorage.setItem 执行完成');
      
      // 立即验证保存结果
      const savedData = localStorage.getItem('lastOpenedVideo');
      console.log('🎥 [视频记忆] 验证保存结果:', savedData ? '✅ 成功' : '❌ 失败');
      if (savedData) {
        console.log('🎥 [视频记忆] 已保存的数据:', savedData);
        console.log('🎥 [视频记忆] 数据长度:', savedData.length);
        // 尝试解析保存的数据
        try {
          const parsed = JSON.parse(savedData);
          console.log('🎥 [视频记忆] 解析保存的数据成功:', parsed.fileName);
        } catch (parseError) {
          console.error('🚫 [视频记忆] 解析保存的数据失败:', parseError);
        }
      } else {
        console.error('🚫 [视频记忆] 保存后立即读取失败！');
      }
      
      console.log('🎥 [视频记忆] === 保存完成 ===');
    } catch (error) {
      console.error('🚫 [视频记忆] 保存最后打开的视频失败:', error);
      console.error('🚫 [视频记忆] 错误详情:', error.message);
      console.error('🚫 [视频记忆] 错误堆栈:', error.stack);
    }
  }
  
  async function restoreLastOpenedVideo() {
    console.log('🎥 [视频记忆] 开始尝试恢复最后打开的视频');
    // 注意：这个函数现在只用于加载视频记忆数据，不再自动播放
    // 应用启动时将始终显示主页，由用户主动选择是否继续播放
    if (!state.lastOpenedVideo) {
      console.log('🎥 [视频记忆] 没有找到最后打开的视频，显示主页');
      showHomePage();
      return;
    }
    
    const videoInfo = state.lastOpenedVideo;
    console.log('🎥 [视频记忆] 找到最后打开的视频:', videoInfo.fileName, '路径:', videoInfo.filePath);
    
    // 不自动加载视频，只显示主页，让用户选择
    console.log('🎥 [视频记忆] 显示主页，由用户选择是否继续播放');
    showHomePage();
  }
  
  function clearLastOpenedVideo() {
    state.lastOpenedVideo = null;
    try {
      localStorage.removeItem('lastOpenedVideo');
      console.log('清除最后打开的视频记录');
    } catch (error) {
      console.error('清除最后打开的视频记录失败:', error);
    }
  }
  
  
  // ==================== 主页功能 ====================
  
  function setupHomePage() {
    console.log('🏠 [主页] 初始化主页功能');
    
    // 主页按钮事件
    if (elements.homeBtn) {
      elements.homeBtn.addEventListener('click', showHomePage);
    }
    
    // 继续上次播放按钮
    if (elements.continueLastVideo) {
      elements.continueLastVideo.addEventListener('click', handleContinueLastVideo);
    }
    
    // 打开新视频按钮
    if (elements.openNewVideo) {
      elements.openNewVideo.addEventListener('click', handleOpenNewVideo);
      
      // 添加拖拽支持
      setupDragAndDrop(elements.openNewVideo, handleVideoFile);
    }
    
    // 单词本按钮
    if (elements.wordBook) {
      elements.wordBook.addEventListener('click', showWordBook);
    }
    
    // 单词本返回按钮
    if (elements.wordBookBackBtn) {
      elements.wordBookBackBtn.addEventListener('click', showHomePage);
    }
    
    // 导出下拉菜单
    setupExportDropdown();
    
    // 导出选项按钮
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const exportAnkiBtn = document.getElementById('exportAnkiBtn');
    const backupWordsBtn = document.getElementById('backupWordsBtn');
    const restoreWordsBtn = document.getElementById('restoreWordsBtn');
    
    if (exportTxtBtn) {
      exportTxtBtn.addEventListener('click', exportWordsToTxt);
    }
    
    if (exportAnkiBtn) {
      exportAnkiBtn.addEventListener('click', exportWordsToAnki);
    }
    
    if (backupWordsBtn) {
      backupWordsBtn.addEventListener('click', backupWordBook);
    }
    
    if (restoreWordsBtn) {
      restoreWordsBtn.addEventListener('click', restoreWordBook);
    }
    
    // 云同步配置按钮
    const cloudSyncConfigBtn = document.getElementById('cloudSyncConfigBtn');
    if (cloudSyncConfigBtn) {
      cloudSyncConfigBtn.addEventListener('click', showCloudSyncDialog);
    }
    
    // 为主页添加全局拖拽支持
    if (elements.homePage) {
      setupDragAndDrop(elements.homePage, handleVideoFile);
    }
    
    // 初始化主页状态
    updateHomePageInfo();
  }
  
  function showHomePage() {
    console.log('🏠 [主页] 显示主页');
    if (elements.homePage && elements.mainContent) {
      elements.homePage.style.display = 'flex';
      elements.mainContent.style.display = 'none';
      
      // 隐藏单词本页面
      if (elements.wordBookPage) {
        elements.wordBookPage.style.display = 'none';
      }
      
      document.title = '视频字幕播放器';
      updateHomePageInfo();
    }
  }
  
  function showMainContent() {
    console.log('🏠 [主页] 显示主内容');
    if (elements.homePage && elements.mainContent) {
      elements.homePage.style.display = 'none';
      elements.mainContent.style.display = 'grid';
      
      // 隐藏单词本页面
      if (elements.wordBookPage) {
        elements.wordBookPage.style.display = 'none';
      }
    }
  }
  
  function updateHomePageInfo() {
    if (!elements.lastVideoInfo) return;
    
    if (state.lastOpenedVideo) {
      const videoInfo = state.lastOpenedVideo;
      const lastOpenedStr = new Date(videoInfo.timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      elements.lastVideoInfo.textContent = `${videoInfo.fileName} (上次打开: ${lastOpenedStr})`;
      
      // 启用继续播放按钮
      if (elements.continueLastVideo) {
        elements.continueLastVideo.classList.remove('disabled');
      }
    } else {
      elements.lastVideoInfo.textContent = '没有找到上次播放的视频';
      
      // 禁用继续播放按钮
      if (elements.continueLastVideo) {
        elements.continueLastVideo.classList.add('disabled');
      }
    }
    
    // 更新单词本信息
    updateWordBookInfo();
    
    // 更新同步状态信息
    updateHomeSyncStatus();
  }
  
  async function handleContinueLastVideo() {
    if (!state.lastOpenedVideo) {
      showNotification('没有找到上次播放的视频', 'error');
      return;
    }
    
    const videoInfo = state.lastOpenedVideo;
    
    // 在Electron环境下检查文件是否存在
    if (isElectron && videoInfo.isElectron && window.electronAPI) {
      try {
        const exists = await window.electronAPI.checkFileExists(videoInfo.filePath);
        if (exists) {
          await handleVideoFile(videoInfo.filePath);
          showNotification(`继续播放: ${videoInfo.fileName}`, 'info');
        } else {
          showNotification('视频文件不存在，请重新选择', 'error');
          clearLastOpenedVideo();
          updateHomePageInfo();
        }
      } catch (error) {
        console.error('检查文件失败:', error);
        showNotification('检查文件失败，请重新选择', 'error');
      }
    } else {
      // 浏览器环境或其他情况
      showNotification(`上次播放: ${videoInfo.fileName}，请重新拖入文件`, 'info');
    }
  }
  
  function handleOpenNewVideo() {
    // 触发文件选择器
    if (elements.videoFileInput) {
      elements.videoFileInput.click();
    }
  }
  
  // ==================== 单词本功能 ====================
  
  function updateWordBookInfo() {
    const wordCount = state.favoriteWords.size;
    if (elements.wordBookInfo) {
      if (wordCount === 0) {
        elements.wordBookInfo.textContent = '查看我收藏的单词';
      } else {
        elements.wordBookInfo.textContent = `已收藏 ${wordCount} 个单词`;
      }
    }
  }
  
  function showWordBook() {
    console.log('📚 [单词本] 显示单词本页面');
    
    if (elements.wordBookPage && elements.homePage) {
      elements.homePage.style.display = 'none';
      elements.wordBookPage.style.display = 'flex';
      document.title = '单词本 - 视频字幕播放器';
      
      // 刷新单词列表
      loadWordBookData();
    }
  }
  
  async function loadWordBookData() {
    console.log('📚 [单词本] 加载单词数据');
    
    // 强制同步收藏状态
    if (isElectron && window.electronAPI) {
      await forceSyncFavoriteState();
      
      // 数据迁移功能已移除，因为工具还在开发中，不涉及旧数据迁移
    }
    
    const wordCount = state.favoriteWords.size;
    
    // 更新统计信息
    if (elements.wordBookCount) {
      elements.wordBookCount.textContent = `${wordCount} 个单词`;
    }
    
    // 更新导出按钮状态 - 导出按钮本身始终可点击（因为包含恢复功能）
    if (elements.exportWordsBtn) {
      elements.exportWordsBtn.disabled = false;
    }
    
    // 更新导出选项的可用状态
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    const exportAnkiBtn = document.getElementById('exportAnkiBtn');
    const backupWordsBtn = document.getElementById('backupWordsBtn');
    const restoreWordsBtn = document.getElementById('restoreWordsBtn');
    
    if (exportTxtBtn) {
      exportTxtBtn.disabled = wordCount === 0;
      exportTxtBtn.style.opacity = wordCount === 0 ? '0.5' : '1';
      exportTxtBtn.style.cursor = wordCount === 0 ? 'not-allowed' : 'pointer';
    }
    
    if (exportAnkiBtn) {
      exportAnkiBtn.disabled = wordCount === 0;
      exportAnkiBtn.style.opacity = wordCount === 0 ? '0.5' : '1';
      exportAnkiBtn.style.cursor = wordCount === 0 ? 'not-allowed' : 'pointer';
    }
    
    if (backupWordsBtn) {
      backupWordsBtn.disabled = wordCount === 0;
      backupWordsBtn.style.opacity = wordCount === 0 ? '0.5' : '1';
      backupWordsBtn.style.cursor = wordCount === 0 ? 'not-allowed' : 'pointer';
    }
    
    // 恢复按钮始终可用
    if (restoreWordsBtn) {
      restoreWordsBtn.disabled = false;
      restoreWordsBtn.style.opacity = '1';
      restoreWordsBtn.style.cursor = 'pointer';
    }
    
    if (wordCount === 0) {
      // 显示空状态
      if (elements.wordBookEmpty) {
        elements.wordBookEmpty.style.display = 'flex';
      }
      if (elements.wordList) {
        elements.wordList.style.display = 'none';
      }
    } else {
      // 显示单词列表
      if (elements.wordBookEmpty) {
        elements.wordBookEmpty.style.display = 'none';
      }
      if (elements.wordList) {
        elements.wordList.style.display = 'grid';
        renderWordList();
      }
    }
  }
  
  async function renderWordList() {
    if (!elements.wordList) return;
    
    console.log('📚 [单词本] 渲染单词列表，总数:', state.favoriteWords.size);
    
    // 清空列表
    elements.wordList.innerHTML = '';
    
    // 获取完整的单词详情
    if (isElectron && window.electronAPI) {
      try {
        const result = await window.electronAPI.loadFavoriteWords();
        if (result.success && result.wordDetails) {
          // 使用完整的单词详情
          const sortedWordDetails = result.wordDetails.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));
          
          sortedWordDetails.forEach(wordDetail => {
            const wordItem = createWordItemWithDetails(wordDetail);
            elements.wordList.appendChild(wordItem);
          });
        } else {
          // 降级到简单模式
          const sortedWords = Array.from(state.favoriteWords).sort();
          sortedWords.forEach(word => {
            const wordItem = createWordItem(word);
            elements.wordList.appendChild(wordItem);
          });
        }
      } catch (error) {
        console.error('获取单词详情失败:', error);
        // 降级到简单模式
        const sortedWords = Array.from(state.favoriteWords).sort();
        sortedWords.forEach(word => {
          const wordItem = createWordItem(word);
          elements.wordList.appendChild(wordItem);
        });
      }
    } else {
      // 浏览器环境，使用简单模式
      const sortedWords = Array.from(state.favoriteWords).sort();
      sortedWords.forEach(word => {
        const wordItem = createWordItem(word);
        elements.wordList.appendChild(wordItem);
      });
    }
    
    // 重新初始化图标
    lucide.createIcons();
  }
  
  // 创建带完整详情的单词项
  function createWordItemWithDetails(wordDetail) {
    const wordItem = document.createElement('div');
    wordItem.className = 'word-item';
    wordItem.dataset.word = wordDetail.word;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '最近收藏';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      } catch {
        return '最近收藏';
      }
    };
    
    wordItem.innerHTML = `
      <div class="word-item-header">
        <span class="word-text">${wordDetail.word}</span>
        <button class="remove-word-btn" title="移除收藏">
          <i data-lucide="x" style="width: 12px; height: 12px;"></i>
        </button>
      </div>
      ${wordDetail.pronunciation ? `<div class="word-phonetic-display">${wordDetail.pronunciation}</div>` : ''}
      ${wordDetail.translation ? `<div class="word-translation">${wordDetail.translation}</div>` : ''}
      ${wordDetail.screenshot ? `
        <div class="word-detail-label">视频截图</div>
        <div class="word-screenshot-container">
          <img src="${wordDetail.screenshot}" alt="视频截图" class="word-screenshot" />
        </div>
      ` : ''}
      ${wordDetail.aiExplanation ? `
        <div class="word-detail-label">AI 语境解释</div>
        <div class="word-ai-explanation">${wordDetail.aiExplanation}</div>
      ` : ''}
      ${wordDetail.exampleSentence ? `
        <div class="word-detail-label">例句</div>
        <div class="word-example-sentence">${wordDetail.exampleSentence}</div>
      ` : ''}
      ${wordDetail.sentenceTranslation ? `
        <div class="word-detail-label">整句翻译</div>
        <div class="word-sentence-translation">${wordDetail.sentenceTranslation}</div>
      ` : ''}
      <div class="word-added-time">${formatDate(wordDetail.createdAt)}</div>
    `;
    
    // 点击单词发音
    wordItem.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-word-btn')) {
        console.log('📚 [单词本] 点击单词发音:', wordDetail.word);
        pronounceWord(wordDetail.word);
      }
    });
    
    // 移除按钮事件
    const removeBtn = wordItem.querySelector('.remove-word-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await removeWordFromFavorites(wordDetail.word);
      });
    }
    
    return wordItem;
  }
  
  // 创建简单的单词项（向后兼容）
  function createWordItem(word) {
    const wordItem = document.createElement('div');
    wordItem.className = 'word-item';
    wordItem.dataset.word = word;
    
    const phoneticText = `/${word.toLowerCase()}/`;
    const addedTime = '最近收藏';
    
    wordItem.innerHTML = `
      <div class="word-item-header">
        <span class="word-text">${word}</span>
        <button class="remove-word-btn" title="移除收藏">
          <i data-lucide="x" style="width: 12px; height: 12px;"></i>
        </button>
      </div>
      <div class="word-phonetic-display">${phoneticText}</div>
      <div class="word-added-time">${addedTime}</div>
    `;
    
    // 点击单词发音
    wordItem.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-word-btn')) {
        console.log('📚 [单词本] 点击单词发音:', word);
        pronounceWord(word);
      }
    });
    
    // 移除按钮事件
    const removeBtn = wordItem.querySelector('.remove-word-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await removeWordFromFavorites(word);
      });
    }
    
    return wordItem;
  }
  
  async function removeWordFromFavorites(word) {
    console.log('📚 [单词本] 移除收藏单词:', word);
    
    if (isElectron && window.electronAPI) {
      const removeResult = await window.electronAPI.removeFavoriteWord(word);
      if (removeResult.success) {
        // 从本地状态中移除
        state.favoriteWords.forEach(favWord => {
          if (favWord.toLowerCase() === word.toLowerCase()) {
            state.favoriteWords.delete(favWord);
          }
        });
        
        // 直接刷新单词列表显示，避免触发数据迁移检查
        await renderWordList();
        
        // 更新统计信息
        const wordCount = state.favoriteWords.size;
        if (elements.wordBookCount) {
          elements.wordBookCount.textContent = `${wordCount} 个单词`;
        }
        
        // 更新按钮状态
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        const exportAnkiBtn = document.getElementById('exportAnkiBtn');
        const backupWordsBtn = document.getElementById('backupWordsBtn');
        
        if (exportTxtBtn) {
          exportTxtBtn.disabled = wordCount === 0;
          exportTxtBtn.style.opacity = wordCount === 0 ? '0.5' : '1';
          exportTxtBtn.style.cursor = wordCount === 0 ? 'not-allowed' : 'pointer';
        }
        
        if (exportAnkiBtn) {
          exportAnkiBtn.disabled = wordCount === 0;
          exportAnkiBtn.style.opacity = wordCount === 0 ? '0.5' : '1';
          exportAnkiBtn.style.cursor = wordCount === 0 ? 'not-allowed' : 'pointer';
        }
        
        if (backupWordsBtn) {
          backupWordsBtn.disabled = wordCount === 0;
          backupWordsBtn.style.opacity = wordCount === 0 ? '0.5' : '1';
          backupWordsBtn.style.cursor = wordCount === 0 ? 'not-allowed' : 'pointer';
        }
        
        // 刷新主页信息
        updateWordBookInfo();
        
        showNotification(`已移除收藏: ${word}`, 'info');
      } else {
        showNotification(`移除失败: ${removeResult.error}`, 'error');
      }
    } else {
      // 浏览器环境下的处理
      state.favoriteWords.delete(word);
      await renderWordList();
      updateWordBookInfo();
      showNotification(`已移除收藏: ${word}`, 'info');
    }
  }
  
  // ==================== 导出下拉菜单功能 ====================
  
  function setupExportDropdown() {
    const exportDropdown = document.querySelector('.export-dropdown');
    const exportBtn = document.getElementById('exportWordsBtn');
    const exportDropdownMenu = document.getElementById('exportDropdownMenu');
    
    if (!exportDropdown || !exportBtn || !exportDropdownMenu) {
      return;
    }
    
    // 点击导出按钮切换下拉菜单
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportDropdown.classList.toggle('open');
    });
    
    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', (e) => {
      if (!exportDropdown.contains(e.target)) {
        exportDropdown.classList.remove('open');
      }
    });
    
    // 点击导出选项后关闭下拉菜单
    const exportOptions = exportDropdownMenu.querySelectorAll('.export-option');
    exportOptions.forEach(option => {
      option.addEventListener('click', () => {
        exportDropdown.classList.remove('open');
      });
    });
  }
  
  // ==================== 单词备份与恢复功能 ====================
  
  // 备份单词本数据（ZIP格式）
  async function backupWordBook() {
    console.log('📚 [备份] 开始备份单词本数据');
    
    // 检查按钮是否被禁用
    const backupWordsBtn = document.getElementById('backupWordsBtn');
    if (backupWordsBtn && backupWordsBtn.disabled) {
      showNotification('单词本为空，没有可备份的数据', 'warning');
      return;
    }
    
    if (state.favoriteWords.size === 0) {
      showNotification('单词本为空，没有可备份的数据', 'warning');
      return;
    }
    
    try {
      // 动态导入JSZip
      const JSZip = (await import('https://cdn.skypack.dev/jszip')).default;
      
      // 获取完整的单词详情数据
      const result = await window.electronAPI.loadFavoriteWords();
      if (!result.success) {
        throw new Error(result.error || '获取单词数据失败');
      }
      
      const wordDetails = result.wordDetails || [];
      
      // 创建ZIP实例
      const zip = new JSZip();
      
      // 创建images文件夹
      const imagesFolder = zip.folder('images');
      
      // 处理单词数据，分离图片
      const processedWords = [];
      let imageIndex = 0;
      
      for (const word of wordDetails) {
        const processedWord = {
          word: word.word,
          pronunciation: word.pronunciation || '',
          translation: word.translation || '',
          aiExplanation: word.aiExplanation || '',
          exampleSentence: word.exampleSentence || '',
          sentenceTranslation: word.sentenceTranslation || '',
          screenshotFile: null, // 图片文件名引用
          createdAt: word.createdAt,
          updatedAt: word.updatedAt
        };
        
        // 如果有截图，保存为单独的图片文件
        if (word.screenshot && word.screenshot.startsWith('data:image/')) {
          const imageFileName = `screenshot_${imageIndex}_${word.word.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
          
          // 提取base64数据
          const base64Data = word.screenshot.split(',')[1];
          
          // 添加图片到ZIP
          imagesFolder.file(imageFileName, base64Data, { base64: true });
          
          // 在单词数据中记录图片文件名
          processedWord.screenshotFile = `images/${imageFileName}`;
          imageIndex++;
        }
        
        processedWords.push(processedWord);
      }
      
      // 创建备份元数据
      const backupData = {
        metadata: {
          version: '2.0.0', // 升级版本号
          appName: 'TalkiePlay',
          exportDate: new Date().toISOString(),
          totalWords: processedWords.length,
          totalImages: imageIndex,
          format: 'zip'
        },
        words: processedWords
      };
      
      // 添加JSON数据文件到ZIP
      zip.file('wordbook.json', JSON.stringify(backupData, null, 2));
      
      // 添加说明文件
      const readmeContent = `TalkiePlay 单词本备份文件\n\n备份时间: ${new Date().toLocaleString()}\n单词数量: ${processedWords.length}\n图片数量: ${imageIndex}\n\n文件结构:\n- wordbook.json: 单词数据\n- images/: 截图文件夹\n\n恢复方法: 在TalkiePlay中选择"恢复单词本"功能`;
      zip.file('README.txt', readmeContent);
      
      // 生成ZIP文件
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // 生成备份文件名
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 19).replace(/[T:]/g, '_').replace(/-/g, '');
      const fileName = `TalkiePlay_单词本备份_${dateStr}.zip`;
      
      if (isElectron && window.electronAPI && window.electronAPI.saveBinaryFile) {
        // Electron环境：使用原生文件对话框保存二进制文件
        const arrayBuffer = await zipBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const result = await window.electronAPI.saveBinaryFile(uint8Array, fileName);
        if (result.success) {
          showNotification(`备份成功：${result.filePath}`, 'success');
          console.log('📚 [备份] ZIP备份成功:', result.filePath);
        } else {
          showNotification(`备份失败：${result.error}`, 'error');
          console.error('📚 [备份] ZIP备份失败:', result.error);
        }
      } else {
        // 浏览器环境：使用下载链接
        const url = URL.createObjectURL(zipBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification(`备份成功：${fileName}`, 'success');
        console.log('📚 [备份] 浏览器ZIP备份成功:', fileName);
      }
      
    } catch (error) {
      console.error('📚 [备份] ZIP备份失败:', error);
      showNotification('备份失败，请重试', 'error');
    }
  }
  
  // 恢复单词本数据（支持ZIP和JSON格式）
  async function restoreWordBook() {
    console.log('📚 [恢复] 开始恢复单词本数据');
    
    try {
      // 创建文件输入元素
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.zip,.json';
      fileInput.style.display = 'none';
      
      // 监听文件选择
      fileInput.addEventListener('change', async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
          let backupData;
          
          if (file.name.toLowerCase().endsWith('.zip')) {
            // 处理ZIP格式备份文件
            backupData = await processZipBackupFile(file);
          } else if (file.name.toLowerCase().endsWith('.json')) {
            // 处理JSON格式备份文件（向后兼容）
            const fileContent = await readFileAsText(file);
            backupData = JSON.parse(fileContent);
          } else {
            showNotification('不支持的文件格式，请选择.zip或.json文件', 'error');
            return;
          }
          
          // 验证备份文件格式
          if (!validateBackupData(backupData)) {
            showNotification('备份文件格式无效', 'error');
            return;
          }
          
          // 显示恢复确认对话框
          showRestoreConfirmDialog(backupData);
          
        } catch (error) {
          console.error('📚 [恢复] 读取备份文件失败:', error);
          showNotification('备份文件读取失败，请检查文件格式', 'error');
        }
      });
      
      // 触发文件选择
      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
      
    } catch (error) {
      console.error('📚 [恢复] 恢复过程失败:', error);
      showNotification('恢复失败，请重试', 'error');
    }
  }
  
  // 处理ZIP格式备份文件
  async function processZipBackupFile(file) {
    try {
      // 动态导入JSZip
      const JSZip = (await import('https://cdn.skypack.dev/jszip')).default;
      
      // 读取ZIP文件
      const zip = await JSZip.loadAsync(file);
      
      // 读取wordbook.json文件
      const wordbookFile = zip.file('wordbook.json');
      if (!wordbookFile) {
        throw new Error('备份文件中缺少wordbook.json');
      }
      
      const jsonContent = await wordbookFile.async('text');
      const backupData = JSON.parse(jsonContent);
      
      // 读取图片文件并转换为base64
      const imagesFolder = zip.folder('images');
      if (imagesFolder) {
        const imageFiles = [];
        imagesFolder.forEach((relativePath, file) => {
          if (!file.dir) {
            imageFiles.push({ path: relativePath, file: file });
          }
        });
        
        // 为每个单词恢复图片数据
        for (const word of backupData.words) {
          if (word.screenshotFile) {
            // 查找对应的图片文件
            const imagePath = word.screenshotFile.replace('images/', '');
            const imageFile = imageFiles.find(img => img.path === imagePath);
            
            if (imageFile) {
              // 读取图片数据并转换为base64
              const imageData = await imageFile.file.async('base64');
              word.screenshot = `data:image/jpeg;base64,${imageData}`;
            }
            
            // 清理临时字段
            delete word.screenshotFile;
          }
        }
      }
      
      console.log('📚 [恢复] ZIP文件解析成功，单词数量:', backupData.words.length);
      return backupData;
      
    } catch (error) {
      console.error('📚 [恢复] ZIP文件处理失败:', error);
      throw new Error('ZIP文件解析失败: ' + error.message);
    }
  }
  
  // 读取文件为文本
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'utf-8');
    });
  }
  
  // 验证备份数据格式
  function validateBackupData(backupData) {
    try {
      // 检查基本结构
      if (!backupData || typeof backupData !== 'object') {
        console.error('📚 [验证] 备份数据不是有效对象');
        return false;
      }
      
      // 检查元数据
      if (!backupData.metadata || typeof backupData.metadata !== 'object') {
        console.error('📚 [验证] 缺少元数据');
        return false;
      }
      
      // 检查版本兼容性
      const version = backupData.metadata.version;
      if (!version) {
        console.error('📚 [验证] 缺少版本信息');
        return false;
      }
      
      // 支持版本1.x.x（JSON格式）和2.x.x（ZIP格式）
      const majorVersion = version.split('.')[0];
      if (majorVersion !== '1' && majorVersion !== '2') {
        console.error('📚 [验证] 不支持的备份文件版本:', version);
        return false;
      }
      
      // 检查单词数据
      if (!Array.isArray(backupData.words)) {
        console.error('📚 [验证] 单词数据格式无效');
        return false;
      }
      
      // 检查单词数据结构
      for (const word of backupData.words) {
        if (!word.word || typeof word.word !== 'string') {
          console.error('📚 [验证] 发现无效的单词数据:', word);
          return false;
        }
      }
      
      console.log('📚 [验证] 备份文件验证通过，版本:', version);
      return true;
    } catch (error) {
      console.error('📚 [验证] 验证过程出错:', error);
      return false;
    }
  }
  
  // 显示恢复确认对话框
  function showRestoreConfirmDialog(backupData) {
    const metadata = backupData.metadata;
    const wordsCount = backupData.words.length;
    const currentWordsCount = state.favoriteWords.size;
    
    // 创建对话框HTML
    const dialogHTML = `
      <div class="restore-dialog-overlay" id="restoreDialogOverlay">
        <div class="restore-dialog">
          <div class="restore-dialog-header">
            <h3>恢复单词本</h3>
            <button class="close-btn" id="closeRestoreDialog">&times;</button>
          </div>
          <div class="restore-dialog-content">
            <div class="backup-info">
              <h4>备份文件信息</h4>
              <p><strong>导出时间：</strong>${new Date(metadata.exportDate).toLocaleString()}</p>
              <p><strong>单词数量：</strong>${wordsCount} 个</p>
              <p><strong>包含截图：</strong>${metadata.hasScreenshots ? '是' : '否'}</p>
            </div>
            <div class="current-info">
              <h4>当前单词本</h4>
              <p><strong>单词数量：</strong>${currentWordsCount} 个</p>
            </div>
            <div class="restore-options">
              <h4>恢复方式</h4>
              <label class="restore-option">
                <input type="radio" name="restoreMode" value="merge" checked>
                <span>合并模式</span>
                <small>保留现有单词，添加备份中的新单词</small>
              </label>
              <label class="restore-option">
                <input type="radio" name="restoreMode" value="overwrite">
                <span>覆盖模式</span>
                <small>清空现有单词，完全使用备份数据</small>
              </label>
            </div>
          </div>
          <div class="restore-dialog-footer">
            <button class="btn btn-secondary" id="cancelRestore">取消</button>
            <button class="btn btn-primary" id="confirmRestore">开始恢复</button>
          </div>
        </div>
      </div>
    `;
    
    // 添加对话框到页面
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    
    // 绑定事件
    const overlay = document.getElementById('restoreDialogOverlay');
    const closeBtn = document.getElementById('closeRestoreDialog');
    const cancelBtn = document.getElementById('cancelRestore');
    const confirmBtn = document.getElementById('confirmRestore');
    
    const closeDialog = () => {
      overlay.remove();
    };
    
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog();
    });
    
    confirmBtn.addEventListener('click', async () => {
      const restoreMode = document.querySelector('input[name="restoreMode"]:checked').value;
      closeDialog();
      await performRestore(backupData, restoreMode);
    });
  }
  
  // 执行恢复操作
  async function performRestore(backupData, restoreMode) {
    console.log('📚 [恢复] 开始执行恢复操作，模式:', restoreMode);
    
    try {
      showNotification('正在恢复单词本...', 'info');
      
      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;
      
      // 如果是覆盖模式，先清空现有数据
      if (restoreMode === 'overwrite') {
        console.log('📚 [恢复] 覆盖模式：清空现有数据');
        // 获取所有现有单词并删除
        const currentWords = Array.from(state.favoriteWords);
        for (const word of currentWords) {
          try {
            await window.electronAPI.removeFavoriteWord(word);
          } catch (error) {
            console.warn('📚 [恢复] 删除现有单词失败:', word, error);
          }
        }
        state.favoriteWords.clear();
      }
      
      // 恢复单词数据
      for (const wordData of backupData.words) {
        try {
          const result = await window.electronAPI.saveFavoriteWord(wordData);
          if (result.success) {
            state.favoriteWords.add(wordData.word.toLowerCase());
            successCount++;
          } else {
            if (result.error.includes('已存在')) {
              skipCount++;
              console.log('📚 [恢复] 单词已存在，跳过:', wordData.word);
            } else {
              errorCount++;
              console.error('📚 [恢复] 恢复单词失败:', wordData.word, result.error);
            }
          }
        } catch (error) {
          errorCount++;
          console.error('📚 [恢复] 恢复单词异常:', wordData.word, error);
        }
      }
      
      // 更新UI
      updateFavoriteButtonState();
      await refreshSubtitleHighlight();
      updateWordBookInfo();
      
      // 刷新单词本页面显示
      if (elements.wordBookPage && elements.wordBookPage.style.display !== 'none') {
        await loadWordBookData();
      }
      
      // 显示恢复结果
      const resultMessage = `恢复完成！成功: ${successCount}，跳过: ${skipCount}，失败: ${errorCount}`;
      showNotification(resultMessage, errorCount > 0 ? 'warning' : 'success');
      
      console.log('📚 [恢复] 恢复完成:', {
        success: successCount,
        skip: skipCount,
        error: errorCount,
        total: backupData.words.length
      });
      
    } catch (error) {
      console.error('📚 [恢复] 恢复过程失败:', error);
      showNotification('恢复失败，请重试', 'error');
    }
  }
  
  // ==================== 单词导出功能 ====================
  
  async function exportWordsToTxt() {
    console.log('📚 [单词本] 开始导出单词');
    
    // 检查按钮是否被禁用
    const exportTxtBtn = document.getElementById('exportTxtBtn');
    if (exportTxtBtn && exportTxtBtn.disabled) {
      showNotification('单词本为空，没有可导出的单词', 'warning');
      return;
    }
    
    if (state.favoriteWords.size === 0) {
      showNotification('单词本为空，没有可导出的单词', 'warning');
      return;
    }
    
    try {
      // 获取所有收藏的单词，按字母顺序排列
      const words = Array.from(state.favoriteWords).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      
      // 生成txt内容，每行一个单词
      const txtContent = words.join('\n');
      
      // 生成文件名，包含当前时间
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const fileName = `我的单词本_${dateStr}.txt`;
      
      if (isElectron && window.electronAPI && window.electronAPI.saveTextFile) {
        // Electron环境：使用原生文件对话框
        const result = await window.electronAPI.saveTextFile(txtContent, fileName);
        if (result.success) {
          showNotification(`导出成功：${result.filePath}`, 'success');
          console.log('📚 [单词本] 导出成功:', result.filePath);
        } else {
          showNotification(`导出失败：${result.error}`, 'error');
          console.error('📚 [单词本] 导出失败:', result.error);
        }
      } else {
        // 浏览器环境：使用下载链接
        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification(`导出成功：${fileName}`, 'success');
        console.log('📚 [单词本] 浏览器导出成功:', fileName);
      }
      
    } catch (error) {
      console.error('📚 [单词本] 导出失败:', error);
      showNotification('导出失败，请重试', 'error');
    }
  }
  
  // Anki记忆卡导出功能
  async function exportWordsToAnki() {
    console.log('📚 [单词本] 开始导出Anki记忆卡');
    
    // 检查按钮是否被禁用
    const exportAnkiBtn = document.getElementById('exportAnkiBtn');
    if (exportAnkiBtn && exportAnkiBtn.disabled) {
      showNotification('单词本为空，没有可导出的单词', 'warning');
      return;
    }
    
    if (state.favoriteWords.size === 0) {
      showNotification('单词本为空，没有可导出的单词', 'warning');
      return;
    }
    
    try {
      // 获取完整的单词详情数据
      const wordsResult = await window.electronAPI.loadFavoriteWords();
      if (!wordsResult.success || !wordsResult.wordDetails) {
        throw new Error('无法获取单词详情数据');
      }
      
      // 通过主进程处理Anki导出
      const result = await window.electronAPI.exportToAnki({
        words: wordsResult.wordDetails, // 传递完整的单词详情数组
        deckName: `我的单词本_${new Date().toISOString().slice(0, 10)}`
      });
      
      if (result.success) {
        showNotification('Anki记忆卡导出成功！', 'success');
        console.log('📚 [单词本] Anki导出成功:', result.filePath);
      } else {
        throw new Error(result.error || '导出失败');
      }
    } catch (error) {
      console.error('📚 [单词本] Anki导出失败:', error);
      showNotification('Anki导出失败，请重试', 'error');
    }
  }
  
  // 原始实现（备用）
  async function exportWordsToAnkiOriginal() {
    console.log('📚 [单词本] 开始导出Anki记忆卡');
    
    if (state.favoriteWords.size === 0) {
      showNotification('没有收藏的单词可导出', 'warning');
      return;
    }
    
    try {
      // 使用require方式导入（仅在Node.js环境中有效）
      const AnkiExport = require('anki-apkg-export');
      
      // 创建Anki包
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const deckName = `我的单词本_${dateStr}`;
      const apkg = new AnkiExport(deckName);
      
      // 获取所有收藏的单词详情
      const words = Array.from(state.favoriteWords).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      
      for (const word of words) {
        // 获取单词详情
        const wordDetail = await getWordDetail(word);
        
        // 构建正面内容（单词、发音、图片）
        let frontContent = `<div style="text-align: center; font-family: Arial, sans-serif;">`;
        frontContent += `<h2 style="font-size: 24px; color: #333; margin-bottom: 10px;">${wordDetail.word}</h2>`;
        
        if (wordDetail.pronunciation) {
          frontContent += `<p style="font-size: 16px; color: #666; margin-bottom: 15px;">${wordDetail.pronunciation}</p>`;
        }
        
        if (wordDetail.screenshot) {
          // 将base64图片添加到Anki包中
          const imageFileName = `${word}_screenshot.png`;
          try {
            // 从base64数据中提取图片数据
            const base64Data = wordDetail.screenshot.split(',')[1];
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            apkg.addMedia(imageFileName, imageBuffer);
            frontContent += `<img src="${imageFileName}" style="max-width: 300px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />`;
          } catch (imgError) {
            console.warn('添加图片失败:', imgError);
          }
        }
        
        frontContent += `</div>`;
        
        // 构建背面内容（单词、发音、图片、翻译、语境解释、例句及例句翻译）
        let backContent = `<div style="font-family: Arial, sans-serif; line-height: 1.6;">`;
        backContent += `<h2 style="font-size: 24px; color: #333; margin-bottom: 10px; text-align: center;">${wordDetail.word}</h2>`;
        
        if (wordDetail.pronunciation) {
          backContent += `<p style="font-size: 16px; color: #666; margin-bottom: 15px; text-align: center;">${wordDetail.pronunciation}</p>`;
        }
        
        if (wordDetail.screenshot) {
          const imageFileName = `${word}_screenshot.png`;
          backContent += `<div style="text-align: center; margin-bottom: 15px;"><img src="${imageFileName}" style="max-width: 300px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" /></div>`;
        }
        
        if (wordDetail.translation) {
          backContent += `<div style="margin-bottom: 15px;"><strong style="color: #2563eb;">翻译：</strong><span style="color: #333;">${wordDetail.translation}</span></div>`;
        }
        
        if (wordDetail.aiExplanation) {
          backContent += `<div style="margin-bottom: 15px;"><strong style="color: #2563eb;">语境解释：</strong><span style="color: #333;">${wordDetail.aiExplanation}</span></div>`;
        }
        
        if (wordDetail.exampleSentence) {
          backContent += `<div style="margin-bottom: 10px;"><strong style="color: #2563eb;">例句：</strong><span style="color: #333; font-style: italic;">${wordDetail.exampleSentence}</span></div>`;
        }
        
        if (wordDetail.sentenceTranslation) {
          backContent += `<div style="margin-bottom: 15px;"><strong style="color: #2563eb;">例句翻译：</strong><span style="color: #333;">${wordDetail.sentenceTranslation}</span></div>`;
        }
        
        backContent += `</div>`;
        
        // 添加卡片到Anki包
        apkg.addCard(frontContent, backContent, {
          tags: ['video-subtitle-player', '单词本']
        });
      }
      
      // 生成并保存文件
      const fileName = `${deckName}.apkg`;
      const zipBuffer = await apkg.save();
      
      if (isElectron && window.electronAPI && window.electronAPI.saveAnkiFile) {
        // Electron环境：使用原生文件对话框
        const result = await window.electronAPI.saveAnkiFile(zipBuffer, fileName);
        if (result.success) {
          showNotification(`Anki记忆卡导出成功：${result.filePath}`, 'success');
          console.log('📚 [单词本] Anki导出成功:', result.filePath);
        } else {
          showNotification(`Anki导出失败：${result.error}`, 'error');
          console.error('📚 [单词本] Anki导出失败:', result.error);
        }
      } else {
        // 浏览器环境：使用下载链接
        const blob = new Blob([zipBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification(`Anki记忆卡导出成功：${fileName}`, 'success');
        console.log('📚 [单词本] Anki浏览器导出成功:', fileName);
      }
      
    } catch (error) {
      console.error('📚 [单词本] Anki导出失败:', error);
      showNotification('Anki导出失败，请重试', 'error');
    }
  }
  
  // ==================== 右键菜单支持 ====================

  function setupContextMenu() {
    console.log('📝 [右键菜单] 初始化右键菜单功能');
    
    // 为文本区域添加右键菜单
    const textAreas = [
      '.dictionary-content',
      '.subtitle-display',
      '.word-result',
      '.dictionary-section',
      '.context-text',
      '.translation-text'
    ];
    
    textAreas.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element) {
          element.addEventListener('contextmenu', handleContextMenu);
        }
      });
    });
    
    // 为整个文档添加右键菜单（兼容性）
    document.addEventListener('contextmenu', handleContextMenu);
  }
  
  function handleContextMenu(event) {
    // 检查是否在可编辑或可选择的元素上
    const target = event.target;
    const isTextSelectable = window.getComputedStyle(target).userSelect !== 'none';
    const hasSelectedText = window.getSelection().toString().length > 0;
    const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // 如果是可选择的文本或者有选中的文本，允许右键菜单
    if (isTextSelectable || hasSelectedText || isInputElement) {
      console.log('📝 [右键菜单] 允许显示右键菜单');
      return; // 不阻止默认行为，允许显示系统右键菜单
    }
    
    // 对于其他区域，可以选择阻止右键菜单（保持原生应用感觉）
    // event.preventDefault();
  }

  // ==================== 自定义视频控件 ====================
  
  function setupCustomVideoControls() {
    console.log('🎮 [自定义控件] 初始化自定义视频控件');
    
    const customControls = document.getElementById('customVideoControls');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const progressBar = document.getElementById('progressBar');
    const progressFilled = document.getElementById('progressFilled');
    const progressHandle = document.getElementById('progressHandle');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const muteBtn = document.getElementById('muteBtn');
    const volumeIcon = document.getElementById('volumeIcon');
    const muteIcon = document.getElementById('muteIcon');
    const volumeSlider = document.getElementById('volumeSlider');
    const speedBtn = document.getElementById('speedBtn');
    const speedText = document.getElementById('speedText');
    const speedMenu = document.getElementById('speedMenu');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const fullscreenIcon = document.getElementById('fullscreenIcon');
    const exitFullscreenIcon = document.getElementById('exitFullscreenIcon');
    
    if (!customControls) {
      console.warn('🚫 [自定义控件] 未找到自定义控件容器');
      return;
    }
    
    // 播放/暂停按钮
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        togglePlayPause();
        updatePlayPauseButton();
      });
    }
    
    // 进度条控制
    if (progressBar) {
      let isDragging = false;
      
      const updateProgress = (e) => {
        if (!elements.videoPlayer.duration) return;
        
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percent * elements.videoPlayer.duration;
        
        elements.videoPlayer.currentTime = newTime;
        updateProgressDisplay();
      };
      
      progressBar.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateProgress(e);
      });
      
      document.addEventListener('mousemove', (e) => {
        if (isDragging) {
          updateProgress(e);
        }
      });
      
      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
      
      progressBar.addEventListener('click', updateProgress);
    }
    
    // 音量控制
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        elements.videoPlayer.muted = !elements.videoPlayer.muted;
        updateVolumeDisplay();
      });
    }
    
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        elements.videoPlayer.volume = volume;
        elements.videoPlayer.muted = volume === 0;
        updateVolumeDisplay();
      });
    }
    
    // 播放速度控制
    if (speedBtn && speedMenu) {
      speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedMenu.classList.toggle('show');
      });
      
      // 点击其他地方关闭速度菜单
      document.addEventListener('click', () => {
        speedMenu.classList.remove('show');
      });
      
      // 速度选项点击
      speedMenu.addEventListener('click', (e) => {
        if (e.target.classList.contains('speed-option')) {
          const speed = parseFloat(e.target.dataset.speed);
          elements.videoPlayer.playbackRate = speed;
          
          // 更新活动状态
          speedMenu.querySelectorAll('.speed-option').forEach(option => {
            option.classList.remove('active');
          });
          e.target.classList.add('active');
          
          // 更新显示文本
          if (speedText) {
            speedText.textContent = speed + 'x';
          }
          
          speedMenu.classList.remove('show');
        }
      });
    }
    
    // 全屏控制
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        toggleFullscreen();
      });
    }
    
    // 监听全屏状态变化
    document.addEventListener('fullscreenchange', updateFullscreenButton);
    document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
    document.addEventListener('mozfullscreenchange', updateFullscreenButton);
    document.addEventListener('MSFullscreenChange', updateFullscreenButton);
    
    // 视频事件监听
    if (elements.videoPlayer) {
      elements.videoPlayer.addEventListener('loadedmetadata', () => {
        updateTimeDisplay();
        updateProgressDisplay();
        showCustomControls();
      });
      
      elements.videoPlayer.addEventListener('timeupdate', () => {
        updateProgressDisplay();
        updateTimeDisplay();
      });
      
      elements.videoPlayer.addEventListener('play', updatePlayPauseButton);
      elements.videoPlayer.addEventListener('pause', updatePlayPauseButton);
      elements.videoPlayer.addEventListener('volumechange', updateVolumeDisplay);
      
      // 添加视频点击播放/暂停功能
      elements.videoPlayer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (elements.videoPlayer.paused) {
          elements.videoPlayer.play().catch(error => {
            console.log('播放失败:', error);
          });
        } else {
          elements.videoPlayer.pause();
        }
      });
    }
    
    console.log('🎮 [自定义控件] 自定义视频控件初始化完成');
  }
  
  function showCustomControls() {
    const customControls = document.getElementById('customVideoControls');
    if (customControls && elements.videoPlayer.src) {
      customControls.style.display = 'block';
      console.log('🎮 [自定义控件] 显示自定义控件');
    }
  }
  
  function hideCustomControls() {
    const customControls = document.getElementById('customVideoControls');
    if (customControls) {
      customControls.style.display = 'none';
      console.log('🎮 [自定义控件] 隐藏自定义控件');
    }
  }
  
  function updatePlayPauseButton() {
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    
    if (playIcon && pauseIcon) {
      if (elements.videoPlayer.paused) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      } else {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      }
    }
  }
  
  function updateProgressDisplay() {
    const progressFilled = document.getElementById('progressFilled');
    const progressHandle = document.getElementById('progressHandle');
    
    if (progressFilled && progressHandle && elements.videoPlayer.duration) {
      const percent = (elements.videoPlayer.currentTime / elements.videoPlayer.duration) * 100;
      progressFilled.style.width = percent + '%';
      progressHandle.style.left = percent + '%';
    }
  }
  
  function updateTimeDisplay() {
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    
    if (currentTimeEl) {
      currentTimeEl.textContent = formatTime(elements.videoPlayer.currentTime || 0);
    }
    
    if (totalTimeEl) {
      totalTimeEl.textContent = formatTime(elements.videoPlayer.duration || 0);
    }
  }
  
  function updateVolumeDisplay() {
    const volumeIcon = document.getElementById('volumeIcon');
    const muteIcon = document.getElementById('muteIcon');
    const volumeSlider = document.getElementById('volumeSlider');
    
    if (volumeIcon && muteIcon) {
      if (elements.videoPlayer.muted || elements.videoPlayer.volume === 0) {
        volumeIcon.style.display = 'none';
        muteIcon.style.display = 'block';
      } else {
        volumeIcon.style.display = 'block';
        muteIcon.style.display = 'none';
      }
    }
    
    if (volumeSlider) {
      volumeSlider.value = elements.videoPlayer.muted ? 0 : elements.videoPlayer.volume * 100;
    }
  }
  
  function toggleFullscreen() {
    const videoContainer = elements.videoContainer;
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && !document.msFullscreenElement) {
      // 进入全屏
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      } else if (videoContainer.webkitRequestFullscreen) {
        videoContainer.webkitRequestFullscreen();
      } else if (videoContainer.mozRequestFullScreen) {
        videoContainer.mozRequestFullScreen();
      } else if (videoContainer.msRequestFullscreen) {
        videoContainer.msRequestFullscreen();
      }
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }
  
  function updateFullscreenButton() {
    const fullscreenIcon = document.getElementById('fullscreenIcon');
    const exitFullscreenIcon = document.getElementById('exitFullscreenIcon');
    
    if (fullscreenIcon && exitFullscreenIcon) {
      const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || 
                          document.mozFullScreenElement || document.msFullscreenElement;
      
      if (isFullscreen) {
        fullscreenIcon.style.display = 'none';
        exitFullscreenIcon.style.display = 'block';
      } else {
        fullscreenIcon.style.display = 'block';
        exitFullscreenIcon.style.display = 'none';
      }
    }
  }
  
  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  // ==================== 云同步功能 ====================
  
  // 云同步配置状态
  let cloudSyncConfig = {
    enabled: false,
    syncFolderPath: '',
    lastSyncTime: null
  };
  
  // 显示云同步配置对话框
  function showCloudSyncDialog() {
    console.log('☁️ [云同步] 显示云同步配置对话框');
    const dialog = document.getElementById('cloudSyncDialog');
    if (dialog) {
      dialog.style.display = 'flex';
      loadCloudSyncConfig();
      setupCloudSyncDialogEvents();
    }
  }
  
  // 设置云同步对话框事件
  function setupCloudSyncDialogEvents() {
    const closeBtn = document.getElementById('closeCloudSyncDialog');
    const selectFolderBtn = document.getElementById('selectSyncFolderBtn');
    const enableSyncBtn = document.getElementById('enableSyncBtn');
    const disableSyncBtn = document.getElementById('disableSyncBtn');
    const forceSyncBtn = document.getElementById('forceSyncBtn');
    const dialog = document.getElementById('cloudSyncDialog');
    
    // 关闭对话框
    if (closeBtn) {
      closeBtn.onclick = () => {
        dialog.style.display = 'none';
      };
    }
    
    // 点击遮罩层关闭
    if (dialog) {
      dialog.onclick = (e) => {
        if (e.target === dialog) {
          dialog.style.display = 'none';
        }
      };
    }
    
    // 选择同步文件夹
    if (selectFolderBtn) {
      selectFolderBtn.onclick = selectSyncFolder;
    }
    
    // 启用云同步
    if (enableSyncBtn) {
      enableSyncBtn.onclick = enableCloudSync;
    }
    
    // 禁用云同步
    if (disableSyncBtn) {
      disableSyncBtn.onclick = disableCloudSync;
    }
    
    // 立即同步
    if (forceSyncBtn) {
      forceSyncBtn.onclick = forceSync;
    }
  }
  
  // 加载云同步配置
  async function loadCloudSyncConfig() {
    try {
      const config = await window.electronAPI.getCloudSyncConfig();
      if (config) {
        cloudSyncConfig = config;
        updateCloudSyncUI();
      }
    } catch (error) {
      console.error('☁️ [云同步] 加载配置失败:', error);
    }
  }
  
  // 更新主页同步状态显示
  async function updateHomeSyncStatus() {
    const homeSyncStatus = document.getElementById('homeSyncStatus');
    const syncStatusText = homeSyncStatus?.querySelector('.sync-status-text');
    
    if (!syncStatusText) return;
    
    try {
      // 获取云同步配置
      const config = await window.electronAPI.getCloudSyncConfig();
      
      if (config && config.enabled) {
        // 已启用同步，显示最近同步时间
        if (config.lastSyncTime) {
          const syncDate = new Date(config.lastSyncTime);
          const now = new Date();
          const diffMs = now - syncDate;
          const diffMins = Math.floor(diffMs / (1000 * 60));
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          let timeText;
         const timeStr = syncDate.toLocaleString('zh-CN', {
           month: 'short',
           day: 'numeric',
           hour: '2-digit',
           minute: '2-digit'
         });
         
         if (diffMins < 1) {
           timeText = `刚刚同步 (${timeStr})`;
         } else if (diffMins < 60) {
           timeText = `${diffMins}分钟前同步 (${timeStr})`;
         } else if (diffHours < 24) {
           timeText = `${diffHours}小时前同步 (${timeStr})`;
         } else {
           timeText = `${diffDays}天前同步 (${timeStr})`;
         }
         
         syncStatusText.textContent = timeText;
         syncStatusText.classList.add('has-sync');
        } else {
          syncStatusText.textContent = '已启用同步';
          syncStatusText.classList.add('has-sync');
        }
      } else {
        // 未启用同步
        syncStatusText.textContent = '未设置同步';
        syncStatusText.classList.remove('has-sync');
      }
      
      // 添加点击事件，引导用户前往单词本页面设置
      syncStatusText.onclick = () => {
        if (!config || !config.enabled) {
          // 切换到单词本页面
          showWordBookPage();
          // 显示提示信息
          setTimeout(() => {
            showNotification('请在单词本页面点击"云同步设置"按钮进行配置', 'info');
          }, 500);
        }
      };
      
    } catch (error) {
      console.error('获取同步状态失败:', error);
      syncStatusText.textContent = '未设置同步';
      syncStatusText.classList.remove('has-sync');
    }
  }
  
  // 更新云同步UI
  function updateCloudSyncUI() {
    const syncFolderPath = document.getElementById('syncFolderPath');
    const syncStatusText = document.getElementById('syncStatusText');
    const lastSyncTime = document.getElementById('lastSyncTime');
    const enableSyncBtn = document.getElementById('enableSyncBtn');
    const disableSyncBtn = document.getElementById('disableSyncBtn');
    const forceSyncBtn = document.getElementById('forceSyncBtn');
    
    if (syncFolderPath) {
      syncFolderPath.value = cloudSyncConfig.syncFolderPath || '';
    }
    
    if (syncStatusText) {
      syncStatusText.textContent = cloudSyncConfig.enabled ? '已启用' : '未启用';
      syncStatusText.style.color = cloudSyncConfig.enabled ? '#10b981' : '#6b7280';
    }
    
    if (lastSyncTime) {
      if (cloudSyncConfig.lastSyncTime) {
        const date = new Date(cloudSyncConfig.lastSyncTime);
        lastSyncTime.textContent = date.toLocaleString('zh-CN');
      } else {
        lastSyncTime.textContent = '从未同步';
      }
    }
    
    // 更新按钮状态
    if (enableSyncBtn) {
      enableSyncBtn.disabled = !cloudSyncConfig.syncFolderPath || cloudSyncConfig.enabled;
      enableSyncBtn.style.display = cloudSyncConfig.enabled ? 'none' : 'flex';
    }
    
    if (disableSyncBtn) {
      disableSyncBtn.style.display = cloudSyncConfig.enabled ? 'flex' : 'none';
    }
    
    if (forceSyncBtn) {
      forceSyncBtn.style.display = cloudSyncConfig.enabled ? 'flex' : 'none';
    }
  }
  
  // 选择同步文件夹
  async function selectSyncFolder() {
    try {
      const folderPath = await window.electronAPI.selectSyncFolder();
      if (folderPath) {
        cloudSyncConfig.syncFolderPath = folderPath;
        updateCloudSyncUI();
        showNotification('已选择同步文件夹: ' + folderPath, 'success');
      }
    } catch (error) {
      console.error('☁️ [云同步] 选择文件夹失败:', error);
      showNotification('选择文件夹失败', 'error');
    }
  }
  
  // 启用云同步
  async function enableCloudSync() {
    if (!cloudSyncConfig.syncFolderPath) {
      showNotification('请先选择同步文件夹', 'error');
      return;
    }
    
    try {
      const result = await window.electronAPI.enableCloudSync(cloudSyncConfig.syncFolderPath);
      if (result.success) {
        cloudSyncConfig.enabled = true;
        cloudSyncConfig.lastSyncTime = new Date().toISOString();
        updateCloudSyncUI();
        showNotification('云同步已启用', 'success');
        
        // 重新加载单词本数据
        await renderWordList();
        // 更新主页同步状态
        await updateHomeSyncStatus();
      } else {
        showNotification('启用云同步失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('☁️ [云同步] 启用失败:', error);
      showNotification('启用云同步失败', 'error');
    }
  }
  
  // 禁用云同步
  async function disableCloudSync() {
    try {
      const result = await window.electronAPI.disableCloudSync();
      if (result.success) {
        cloudSyncConfig.enabled = false;
        updateCloudSyncUI();
        showNotification('云同步已禁用', 'success');
        
        // 重新加载单词本数据
        await renderWordList();
        // 更新主页同步状态
        await updateHomeSyncStatus();
      } else {
        showNotification('禁用云同步失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('☁️ [云同步] 禁用失败:', error);
      showNotification('禁用云同步失败', 'error');
    }
  }
  
  // 立即同步
  async function forceSync() {
    try {
      const result = await window.electronAPI.forceSync();
      if (result.success) {
        cloudSyncConfig.lastSyncTime = new Date().toISOString();
        updateCloudSyncUI();
        showNotification('同步完成', 'success');
        
        // 重新加载单词本数据
        await renderWordList();
        // 更新主页同步状态
        await updateHomeSyncStatus();
      } else {
        showNotification('同步失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('☁️ [云同步] 同步失败:', error);
      showNotification('同步失败', 'error');
    }
  }
  
  // ==================== 自动同步状态监听 ====================
  
  // 监听来自主进程的同步状态更新
  if (isElectron && window.electronAPI) {
    // 监听同步状态更新事件
    window.electronAPI.onSyncStatusUpdate((statusData) => {
      handleSyncStatusUpdate(statusData);
    });
  }
  
  // 处理同步状态更新
  function handleSyncStatusUpdate(statusData) {
    const { status, message } = statusData;
    
    console.log('☁️ [同步状态] 收到状态更新:', status, message);
    
    // 显示同步状态提示
    showSyncStatusNotification(status, message);
    
    // 更新云同步UI状态
    if (status === 'success') {
      // 同步成功后重新加载数据
      setTimeout(async () => {
        await forceSyncFavoriteState();
        await renderWordList();
        // 更新主页同步状态
        await updateHomeSyncStatus();
      }, 500);
    }
  }
  
  // 显示同步状态通知
  function showSyncStatusNotification(status, message) {
    let notificationType;
    let displayMessage;
    
    switch (status) {
      case 'syncing':
        notificationType = 'info';
        displayMessage = '🔄 ' + message;
        break;
      case 'success':
        notificationType = 'success';
        displayMessage = '✅ ' + message;
        break;
      case 'error':
        notificationType = 'error';
        displayMessage = '❌ ' + message;
        break;
      default:
        notificationType = 'info';
        displayMessage = message;
    }
    
    showNotification(displayMessage, notificationType);
  }
  
  // ==================== API配置管理 ====================
  
  // 初始化API配置功能
  async function setupApiConfig() {
    console.log('🔧 [API配置] 初始化API配置功能...');
    
    // 加载用户配置
    await loadUserApiConfig();
    
    // 绑定事件监听器
    if (elements.apiConfigBtn) {
      elements.apiConfigBtn.addEventListener('click', openApiConfigDialog);
    }
    
    if (elements.closeApiConfigDialog) {
      elements.closeApiConfigDialog.addEventListener('click', closeApiConfigDialog);
    }
    
    if (elements.saveApiConfigBtn) {
      elements.saveApiConfigBtn.addEventListener('click', saveApiConfig);
    }
    
    if (elements.resetApiConfigBtn) {
      elements.resetApiConfigBtn.addEventListener('click', resetApiConfig);
    }
    
    // 绑定密钥可见性切换
    bindKeyVisibilityToggles();
    
    console.log('✅ [API配置] API配置功能初始化完成');
  }
  
  // 加载用户API配置
  async function loadUserApiConfig() {
    try {
      if (isElectron && window.electronAPI && window.electronAPI.loadApiConfig) {
        const config = await window.electronAPI.loadApiConfig();
        if (config) {
          userApiConfig = { ...userApiConfig, ...config };
          updateApiConfigFromUserConfig();
          console.log('✅ [API配置] 用户配置加载成功');
        }
      } else {
        // 浏览器环境，从localStorage加载
        const savedConfig = localStorage.getItem('userApiConfig');
        if (savedConfig) {
          userApiConfig = { ...userApiConfig, ...JSON.parse(savedConfig) };
          updateApiConfigFromUserConfig();
          console.log('✅ [API配置] 浏览器配置加载成功');
        }
      }
    } catch (error) {
      console.error('❌ [API配置] 加载用户配置失败:', error);
    }
  }
  
  // 根据用户配置更新API_CONFIG
  function updateApiConfigFromUserConfig() {
    API_CONFIG.GOOGLE_TRANSLATE_KEY = userApiConfig.translation?.google?.enabled ? userApiConfig.translation.google.key : '';
    API_CONFIG.DEEPL_API_KEY = userApiConfig.translation?.deepl?.enabled ? userApiConfig.translation.deepl.key : '';
    API_CONFIG.DEEPSEEK_KEY = userApiConfig.ai?.deepseek?.enabled ? userApiConfig.ai.deepseek.key : '';
    API_CONFIG.ZHIPU_KEY = userApiConfig.ai?.zhipu?.enabled ? userApiConfig.ai.zhipu.key : '';
  }
  
  // 打开API配置对话框
  function openApiConfigDialog() {
    console.log('🔧 [API配置] 打开API配置对话框');
    
    // 填充当前配置到表单
    populateApiConfigForm();
    
    // 显示对话框
    if (elements.apiConfigDialog) {
      elements.apiConfigDialog.style.display = 'flex';
    }
  }
  
  // 关闭API配置对话框
  function closeApiConfigDialog() {
    console.log('🔧 [API配置] 关闭API配置对话框');
    
    if (elements.apiConfigDialog) {
      elements.apiConfigDialog.style.display = 'none';
    }
  }
  
  // 填充API配置表单
  function populateApiConfigForm() {
    // 翻译服务配置
    if (elements.googleTranslateEnabled) {
      elements.googleTranslateEnabled.checked = userApiConfig.translation?.google?.enabled || false;
    }
    if (elements.googleTranslateKey) {
      elements.googleTranslateKey.value = userApiConfig.translation?.google?.key || '';
    }
    
    if (elements.deeplTranslateEnabled) {
      elements.deeplTranslateEnabled.checked = userApiConfig.translation?.deepl?.enabled || false;
    }
    if (elements.deeplTranslateKey) {
      elements.deeplTranslateKey.value = userApiConfig.translation?.deepl?.key || '';
    }
    
    // AI服务配置
    if (elements.deepseekEnabled) {
      elements.deepseekEnabled.checked = userApiConfig.ai?.deepseek?.enabled || false;
    }
    if (elements.deepseekKey) {
      elements.deepseekKey.value = userApiConfig.ai?.deepseek?.key || '';
    }
    
    if (elements.zhipuEnabled) {
      elements.zhipuEnabled.checked = userApiConfig.ai?.zhipu?.enabled || false;
    }
    if (elements.zhipuKey) {
      elements.zhipuKey.value = userApiConfig.ai?.zhipu?.key || '';
    }
    
    // 更新状态显示
    updateApiConfigStatus();
  }
  
  // 保存API配置
  async function saveApiConfig() {
    console.log('💾 [API配置] 保存API配置...');
    
    try {
      // 从表单收集配置
      const newConfig = {
        translation: {
          google: {
            enabled: elements.googleTranslateEnabled?.checked || false,
            key: elements.googleTranslateKey?.value?.trim() || ''
          },
          deepl: {
            enabled: elements.deeplTranslateEnabled?.checked || false,
            key: elements.deeplTranslateKey?.value?.trim() || ''
          }
        },
        ai: {
          deepseek: {
            enabled: elements.deepseekEnabled?.checked || false,
            key: elements.deepseekKey?.value?.trim() || ''
          },
          zhipu: {
            enabled: elements.zhipuEnabled?.checked || false,
            key: elements.zhipuKey?.value?.trim() || ''
          }
        }
      };
      
      // 验证启用的服务是否有有效的API密钥
      const validationErrors = validateApiConfig(newConfig);
      if (validationErrors.length > 0) {
        const errorMessage = '配置验证失败:\n' + validationErrors.join('\n');
        showNotification(errorMessage, 'error');
        return;
      }
      
      // 更新用户配置
      userApiConfig = newConfig;
      
      // 更新API_CONFIG
      updateApiConfigFromUserConfig();
      
      // 保存到存储
      if (isElectron && window.electronAPI && window.electronAPI.saveApiConfig) {
        await window.electronAPI.saveApiConfig(userApiConfig);
      } else {
        localStorage.setItem('userApiConfig', JSON.stringify(userApiConfig));
      }
      
      // 更新状态显示
      updateApiConfigStatus();
      
      console.log('✅ [API配置] 配置保存成功');
      showNotification('API配置保存成功', 'success');
      
    } catch (error) {
      console.error('❌ [API配置] 保存配置失败:', error);
      showNotification('保存配置失败: ' + error.message, 'error');
    }
  }
  
  // 重置API配置
  async function resetApiConfig() {
    console.log('🔄 [API配置] 重置API配置...');
    
    if (confirm('确定要重置所有API配置吗？这将清除所有已保存的API密钥。')) {
      try {
        // 重置用户配置
        userApiConfig = {
          translation: {
            google: { enabled: false, key: '' },
            deepl: { enabled: false, key: '' }
          },
          ai: {
            deepseek: { enabled: false, key: '' },
            zhipu: { enabled: false, key: '' }
          }
        };
        
        // 更新API_CONFIG
        updateApiConfigFromUserConfig();
        
        // 保存到存储
        if (isElectron && window.electronAPI && window.electronAPI.saveApiConfig) {
          await window.electronAPI.saveApiConfig(userApiConfig);
        } else {
          localStorage.setItem('userApiConfig', JSON.stringify(userApiConfig));
        }
        
        // 重新填充表单
        populateApiConfigForm();
        
        console.log('✅ [API配置] 配置重置成功');
        showNotification('API配置已重置', 'success');
        
      } catch (error) {
        console.error('❌ [API配置] 重置配置失败:', error);
        showNotification('重置配置失败: ' + error.message, 'error');
      }
    }
  }
  
  // 绑定密钥可见性切换
  function bindKeyVisibilityToggles() {
    const toggles = [
      { button: elements.toggleGoogleKeyVisibility, input: elements.googleTranslateKey },
      { button: elements.toggleDeeplKeyVisibility, input: elements.deeplTranslateKey },
      { button: elements.toggleDeepseekKeyVisibility, input: elements.deepseekKey },
      { button: elements.toggleZhipuKeyVisibility, input: elements.zhipuKey }
    ];
    
    toggles.forEach(({ button, input }) => {
      if (button && input) {
        button.addEventListener('click', () => {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          button.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
          lucide.createIcons();
        });
      }
    });
  }
  
  // 验证API配置
  function validateApiConfig(config) {
    const errors = [];
    
    // 验证翻译服务
    if (config.translation?.google?.enabled && !config.translation.google.key) {
      errors.push('• Google翻译已启用但未提供API密钥');
    }
    
    if (config.translation?.deepl?.enabled && !config.translation.deepl.key) {
      errors.push('• DeepL翻译已启用但未提供API密钥');
    }
    
    // 验证AI服务
    if (config.ai?.deepseek?.enabled && !config.ai.deepseek.key) {
      errors.push('• DeepSeek AI已启用但未提供API密钥');
    }
    
    if (config.ai?.zhipu?.enabled && !config.ai.zhipu.key) {
      errors.push('• 智谱AI已启用但未提供API密钥');
    }
    
    // 验证API密钥格式
    if (config.translation?.google?.enabled && config.translation.google.key) {
      if (!config.translation.google.key.startsWith('AIza')) {
        errors.push('• Google翻译API密钥格式不正确（应以"AIza"开头）');
      }
    }
    
    if (config.ai?.deepseek?.enabled && config.ai.deepseek.key) {
      if (!config.ai.deepseek.key.startsWith('sk-')) {
        errors.push('• DeepSeek AI API密钥格式不正确（应以"sk-"开头）');
      }
    }
    
    return errors;
  }
  
  // 更新API配置状态显示
  function updateApiConfigStatus() {
    const statusElements = [
      { element: elements.googleTranslateStatus, enabled: userApiConfig.translation?.google?.enabled, hasKey: !!userApiConfig.translation?.google?.key },
      { element: elements.deeplTranslateStatus, enabled: userApiConfig.translation?.deepl?.enabled, hasKey: !!userApiConfig.translation?.deepl?.key },
      { element: elements.deepseekStatus, enabled: userApiConfig.ai?.deepseek?.enabled, hasKey: !!userApiConfig.ai?.deepseek?.key },
      { element: elements.zhipuStatus, enabled: userApiConfig.ai?.zhipu?.enabled, hasKey: !!userApiConfig.ai?.zhipu?.key }
    ];
    
    statusElements.forEach(({ element, enabled, hasKey }) => {
      if (element) {
        if (enabled && hasKey) {
          element.textContent = '已启用';
          element.className = 'api-status enabled';
        } else if (enabled && !hasKey) {
          element.textContent = '需要密钥';
          element.className = 'api-status warning';
        } else {
          element.textContent = '已禁用';
          element.className = 'api-status disabled';
        }
      }
    });
  }
  
});