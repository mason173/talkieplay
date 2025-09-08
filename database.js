let Database = null;
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// 尝试加载 SQLite，如果失败则使用文件存储
try {
  Database = require('better-sqlite3');
  console.log('SQLite 模块加载成功');
} catch (error) {
  console.warn('SQLite 模块加载失败，将使用文件存储:', error.message);
  Database = null;
}

class FavoriteWordsDB {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.useSQLite = Database !== null;
    this.fileStoragePath = null;
    this.imagesPath = null; // 图片文件夹路径
    this.favoriteWords = new Set(); // 文件存储模式下的缓存
    this.favoriteWordsData = []; // 文件存储模式下的完整单词信息
  }

  /**
   * 初始化数据库
   * @param {string} userDataPath - 用户数据目录路径，如果不提供则使用默认应用数据目录
   */
  initialize(userDataPath = null) {
    try {
      const dataDir = userDataPath || app.getPath('userData');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (this.useSQLite) {
        // 使用 SQLite 模式
        this.dbPath = path.join(dataDir, 'favorite_words.db');
        console.log('SQLite 数据库路径:', this.dbPath);

        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.createTables();
        
        console.log('SQLite 数据库初始化成功');
        return { success: true, path: this.dbPath, mode: 'sqlite' };
      } else {
        // 使用文件存储模式 - 统一格式：wordbook.json + images文件夹
        this.fileStoragePath = path.join(dataDir, 'wordbook.json');
        this.imagesPath = path.join(dataDir, 'images');
        console.log('文件存储路径:', this.fileStoragePath);
        console.log('图片存储路径:', this.imagesPath);
        
        // 确保images文件夹存在
        if (!fs.existsSync(this.imagesPath)) {
          fs.mkdirSync(this.imagesPath, { recursive: true });
        }
        
        // 加载现有文件
        this.loadFromFile();
        
        console.log('文件存储初始化成功（统一格式）');
        return { success: true, path: this.fileStoragePath, mode: 'file' };
      }
    } catch (error) {
      console.error('数据库初始化失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 创建必要的表
   */
  createTables() {
    if (!this.useSQLite || !this.db) return;
    
    // 检查是否需要迁移旧表结构
    const checkTableSQL = `
      SELECT name FROM sqlite_master WHERE type='table' AND name='favorite_words'
    `;
    const tableExists = this.db.prepare(checkTableSQL).get();
    
    if (tableExists) {
      // 检查是否有新字段
      const checkColumnSQL = `
        PRAGMA table_info(favorite_words)
      `;
      const columns = this.db.prepare(checkColumnSQL).all();
      const hasNewFields = columns.some(col => col.name === 'pronunciation');
      
      if (!hasNewFields) {
        // 需要迁移，先备份旧数据
        console.log('检测到旧表结构，开始迁移数据...');
        this.db.exec(`
          CREATE TABLE favorite_words_backup AS SELECT * FROM favorite_words;
          DROP TABLE favorite_words;
        `);
      }
    }
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS favorite_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL UNIQUE,
        pronunciation TEXT,
        translation TEXT,
        ai_explanation TEXT,
        example_sentence TEXT,
        sentence_translation TEXT,
        screenshot TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_word ON favorite_words(word)
    `;

    this.db.exec(createTableSQL);
    this.db.exec(createIndexSQL);
    
    // 如果有备份数据，迁移回来
    const backupTableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='favorite_words_backup'
    `).get();
    
    if (backupTableExists) {
      console.log('迁移旧数据到新表结构...');
      this.db.exec(`
        INSERT INTO favorite_words (word, created_at, updated_at)
        SELECT word, created_at, updated_at FROM favorite_words_backup;
        DROP TABLE favorite_words_backup;
      `);
      console.log('数据迁移完成');
    }
  }

  /**
   * 从文件加载数据（文件存储模式）- 统一格式
   */
  loadFromFile() {
    if (this.useSQLite) return;
    
    try {
      if (fs.existsSync(this.fileStoragePath)) {
        const content = fs.readFileSync(this.fileStoragePath, 'utf8');
        const backupData = JSON.parse(content);
        
        // 解析统一格式的数据结构
        if (backupData.words && Array.isArray(backupData.words)) {
          this.favoriteWordsData = backupData.words.map(word => ({
            ...word,
            // 如果有图片文件引用，转换为完整路径
            screenshot: word.screenshotFile ? 
              this.loadImageAsBase64(word.screenshotFile) : (word.screenshot || '')
          }));
          this.favoriteWords = new Set(backupData.words.map(item => item.word.toLowerCase()));
          console.log(`从文件加载 ${backupData.words.length} 个收藏单词（统一格式）`);
        } else {
          // 兼容简单数组格式
          this.favoriteWordsData = backupData;
          this.favoriteWords = new Set(backupData.map(item => item.word.toLowerCase()));
          console.log(`从文件加载 ${backupData.length} 个收藏单词（简单格式）`);
        }
      } else {
        this.favoriteWords = new Set();
        this.favoriteWordsData = [];
      }
    } catch (error) {
      console.error('加载收藏文件失败:', error);
      this.favoriteWords = new Set();
      this.favoriteWordsData = [];
    }
  }

  /**
   * 加载图片文件为Base64格式
   */
  loadImageAsBase64(imageFilePath) {
    try {
      const fullImagePath = path.join(path.dirname(this.fileStoragePath), imageFilePath);
      if (fs.existsSync(fullImagePath)) {
        const imageBuffer = fs.readFileSync(fullImagePath);
        const base64Data = imageBuffer.toString('base64');
        return `data:image/jpeg;base64,${base64Data}`;
      }
    } catch (error) {
      console.error('加载图片文件失败:', error);
    }
    return '';
  }

  /**
   * 保存数据到文件（文件存储模式）- 统一格式
   */
  saveToFile() {
    if (this.useSQLite) return;
    
    try {
      // 处理单词数据，分离图片
      const processedWords = [];
      let imageIndex = 0;
      
      for (const word of this.favoriteWordsData || []) {
        const processedWord = {
          word: word.word,
          pronunciation: word.pronunciation || '',
          translation: word.translation || '',
          aiExplanation: word.aiExplanation || '',
          exampleSentence: word.exampleSentence || '',
          sentenceTranslation: word.sentenceTranslation || '',
          screenshotFile: null,
          createdAt: word.createdAt,
          updatedAt: word.updatedAt
        };
        
        // 如果有截图，保存为单独的图片文件
        if (word.screenshot && word.screenshot.startsWith('data:image/')) {
          const wordForFileName = word.word.replace(/[^a-zA-Z0-9]/g, '_');
          
          // 检查是否已存在对应的图片文件
          let existingImageFile = null;
          try {
            const imageFiles = fs.readdirSync(this.imagesPath);
            existingImageFile = imageFiles.find(file => 
              file.includes(`_${wordForFileName}.jpg`)
            );
          } catch (err) {
            // 图片目录不存在或读取失败，继续创建新文件
          }
          
          let imageFileName;
          if (existingImageFile) {
            // 使用现有的图片文件名
            imageFileName = existingImageFile;
          } else {
            // 创建新的图片文件名
            imageFileName = `screenshot_${imageIndex}_${wordForFileName}.jpg`;
            const imagePath = path.join(this.imagesPath, imageFileName);
            
            // 提取base64数据并保存图片文件
            const base64Data = word.screenshot.split(',')[1];
            fs.writeFileSync(imagePath, base64Data, 'base64');
            imageIndex++;
          }
          
          // 在单词数据中记录图片文件名
          processedWord.screenshotFile = `images/${imageFileName}`;
        }
        
        processedWords.push(processedWord);
      }
      
      // 创建统一格式的数据结构
      const backupData = {
        metadata: {
          version: '2.0.0',
          appName: 'TalkiePlay',
          exportDate: new Date().toISOString(),
          totalWords: processedWords.length,
          totalImages: imageIndex,
          format: 'unified'
        },
        words: processedWords
      };
      
      // 保存JSON文件
      const content = JSON.stringify(backupData, null, 2);
      fs.writeFileSync(this.fileStoragePath, content, 'utf8');
    } catch (error) {
      console.error('保存收藏文件失败:', error);
      throw error;
    }
  }

  /**
   * 添加收藏单词
   * @param {string|Object} wordData - 要收藏的单词或单词信息对象
   * @returns {Object} 操作结果
   */
  addWord(wordData) {
    // 兼容旧格式（字符串）和新格式（对象）
    let word, pronunciation, translation, aiExplanation, exampleSentence, sentenceTranslation, screenshot;
    
    if (typeof wordData === 'string') {
      // 旧格式：只有单词
      word = wordData.trim().toLowerCase();
      pronunciation = '';
      translation = '';
      aiExplanation = '';
      exampleSentence = '';
      sentenceTranslation = '';
      screenshot = '';
    } else if (typeof wordData === 'object' && wordData !== null) {
      // 新格式：完整的单词信息对象
      word = (wordData.word || '').toString().trim().toLowerCase();
      pronunciation = wordData.pronunciation || '';
      translation = wordData.translation || '';
      aiExplanation = wordData.ai_explanation || wordData.aiExplanation || '';
      exampleSentence = wordData.example_sentence || wordData.exampleSentence || '';
      sentenceTranslation = wordData.sentence_translation || wordData.sentenceTranslation || '';
      screenshot = wordData.screenshot || '';
    } else {
      return { success: false, error: '无效的单词数据格式' };
    }
    
    if (!word) {
      return { success: false, error: '单词不能为空' };
    }

    if (this.useSQLite && this.db) {
      // SQLite 模式
      try {
        const stmt = this.db.prepare(`
          INSERT INTO favorite_words (word, pronunciation, translation, ai_explanation, example_sentence, sentence_translation, screenshot) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(word, pronunciation, translation, aiExplanation, exampleSentence, sentenceTranslation, screenshot);
        
        return { 
          success: true, 
          message: '收藏成功',
          id: result.lastInsertRowid,
          word: word
        };
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return { success: false, error: '单词已存在' };
        }
        console.error('添加单词失败:', error);
        return { success: false, error: error.message };
      }
    } else {
      // 文件存储模式 - 现在支持完整的单词信息
      try {
        if (this.favoriteWords.has(word)) {
          return { success: false, error: '单词已存在' };
        }
        
        // 确保favoriteWordsData数组存在
        if (!this.favoriteWordsData) {
          this.favoriteWordsData = [];
        }
        
        // 添加完整的单词信息
        const wordDetail = {
          word: word,
          pronunciation: pronunciation || '',
          translation: translation || '',
          aiExplanation: aiExplanation || '',
          exampleSentence: exampleSentence || '',
          sentenceTranslation: sentenceTranslation || '',
          screenshot: screenshot || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.favoriteWordsData.push(wordDetail);
        this.favoriteWords.add(word);
        this.saveToFile();
        
        return { 
          success: true, 
          message: '收藏成功',
          word: word
        };
      } catch (error) {
        console.error('添加单词失败:', error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * 删除收藏单词
   * @param {string} word - 要删除的单词
   * @returns {Object} 操作结果
   */
  removeWord(word) {
    const trimmedWord = word.trim().toLowerCase();
    if (!trimmedWord) {
      return { success: false, error: '单词不能为空' };
    }

    if (this.useSQLite && this.db) {
      // SQLite 模式
      try {
        const stmt = this.db.prepare(`
          DELETE FROM favorite_words WHERE word = ?
        `);
        
        const result = stmt.run(trimmedWord);
        
        if (result.changes > 0) {
          return { 
            success: true, 
            message: '取消收藏成功',
            word: trimmedWord
          };
        } else {
          return { success: false, error: '单词不存在于收藏列表中' };
        }
      } catch (error) {
        console.error('删除单词失败:', error);
        return { success: false, error: error.message };
      }
    } else {
      // 文件存储模式
      try {
        if (!this.favoriteWords.has(trimmedWord)) {
          return { success: false, error: '单词不存在于收藏列表中' };
        }
        
        // 找到要删除的单词并删除对应的图片文件
        if (this.favoriteWordsData) {
          const wordToDelete = this.favoriteWordsData.find(
            item => item.word.toLowerCase() === trimmedWord
          );
          
          if (wordToDelete && wordToDelete.screenshot) {
            // 删除对应的图片文件
            try {
              const wordForFileName = wordToDelete.word.replace(/[^a-zA-Z0-9]/g, '_');
              const imageFiles = fs.readdirSync(this.imagesPath);
              const imageFileToDelete = imageFiles.find(file => 
                file.includes(`_${wordForFileName}.jpg`)
              );
              
              if (imageFileToDelete) {
                const imageFilePath = path.join(this.imagesPath, imageFileToDelete);
                if (fs.existsSync(imageFilePath)) {
                  fs.unlinkSync(imageFilePath);
                  console.log(`已删除图片文件: ${imageFileToDelete}`);
                }
              }
            } catch (imageError) {
              console.warn('删除图片文件时出错:', imageError);
            }
          }
          
          // 从favoriteWordsData中删除对应的单词详情
          this.favoriteWordsData = this.favoriteWordsData.filter(
            item => item.word.toLowerCase() !== trimmedWord
          );
        }
        
        this.favoriteWords.delete(trimmedWord);
        this.saveToFile();
        
        return { 
          success: true, 
          message: '取消收藏成功',
          word: trimmedWord
        };
      } catch (error) {
        console.error('删除单词失败:', error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * 检查单词是否已收藏
   * @param {string} word - 要检查的单词
   * @returns {boolean} 是否已收藏
   */
  isWordFavorited(word) {
    const trimmedWord = word.trim().toLowerCase();
    
    if (this.useSQLite && this.db) {
      // SQLite 模式
      try {
        const stmt = this.db.prepare(`
          SELECT 1 FROM favorite_words WHERE word = ? LIMIT 1
        `);
        
        const result = stmt.get(trimmedWord);
        return !!result;
      } catch (error) {
        console.error('检查单词失败:', error);
        return false;
      }
    } else {
      // 文件存储模式
      return this.favoriteWords.has(trimmedWord);
    }
  }

  /**
   * 获取所有收藏的单词
   * @returns {Object} 包含单词列表的结果
   */
  getAllWords() {
    if (this.useSQLite && this.db) {
      // SQLite 模式
      try {
        const stmt = this.db.prepare(`
          SELECT word, pronunciation, translation, ai_explanation, example_sentence, sentence_translation, created_at, updated_at 
          FROM favorite_words 
          ORDER BY created_at DESC
        `);
        
        const rows = stmt.all();
        const words = rows.map(row => row.word); // 保持向后兼容
        const wordDetails = rows.map(row => ({
          word: row.word,
          pronunciation: row.pronunciation || '',
          translation: row.translation || '',
          aiExplanation: row.ai_explanation || '',
          exampleSentence: row.example_sentence || '',
          sentenceTranslation: row.sentence_translation || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }));
        
        return { 
          success: true, 
          words, // 保持向后兼容
          wordDetails, // 新的完整信息
          count: words.length,
          details: rows // 原始数据库行
        };
      } catch (error) {
        console.error('获取单词列表失败:', error);
        return { success: false, error: error.message, words: [], wordDetails: [] };
      }
    } else {
      // 文件存储模式 - 返回实际保存的详细信息
      const words = Array.from(this.favoriteWords).sort();
      
      // 确保favoriteWordsData存在
      if (!this.favoriteWordsData) {
        this.favoriteWordsData = [];
      }
      
      // 按创建时间倒序排列
      const sortedWordDetails = this.favoriteWordsData
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { 
        success: true, 
        words,
        wordDetails: sortedWordDetails,
        count: words.length
      };
    }
  }

  /**
   * 迁移现有单词数据，为缺失详细信息的单词添加默认值
   * @returns {Object} 迁移结果
   */
  migrateExistingWords() {
    if (this.useSQLite && this.db) {
      // SQLite 模式的数据迁移
      try {
        // 查找需要迁移的单词（缺少详细信息的记录）
        const stmt = this.db.prepare(`
          SELECT word FROM favorite_words 
          WHERE (pronunciation IS NULL OR pronunciation = '') 
             OR (translation IS NULL OR translation = '') 
             OR (ai_explanation IS NULL OR ai_explanation = '')
        `);
        
        const wordsToMigrate = stmt.all();
        
        if (wordsToMigrate.length === 0) {
          return { success: true, message: '所有单词已包含完整信息，无需迁移', migratedCount: 0 };
        }

        // 为每个需要迁移的单词更新默认信息
        const updateStmt = this.db.prepare(`
          UPDATE favorite_words 
          SET pronunciation = COALESCE(NULLIF(pronunciation, ''), '/' || word || '/'),
              translation = COALESCE(NULLIF(translation, ''), '待查询'),
              ai_explanation = COALESCE(NULLIF(ai_explanation, ''), '暂无AI解释'),
              example_sentence = COALESCE(NULLIF(example_sentence, ''), ''),
              sentence_translation = COALESCE(NULLIF(sentence_translation, ''), ''),
              updated_at = datetime('now')
          WHERE word = ?
        `);

        let migratedCount = 0;
        for (const row of wordsToMigrate) {
          updateStmt.run(row.word);
          migratedCount++;
        }

        return { 
          success: true, 
          message: `成功迁移 ${migratedCount} 个单词的数据`, 
          migratedCount 
        };
      } catch (error) {
        console.error('SQLite数据迁移失败:', error);
        return { success: false, error: error.message };
      }
    } else {
      // 文件存储模式的数据迁移
      try {
        if (!this.favoriteWords || this.favoriteWords.size === 0) {
          return { success: true, message: '没有需要迁移的单词', migratedCount: 0 };
        }

        // 文件存储模式下，单词只是简单的字符串列表
        // 我们需要将它们转换为包含详细信息的对象格式
        const wordsArray = Array.from(this.favoriteWords);
        let migratedCount = 0;
        
        // 清空当前的favoriteWords集合
        this.favoriteWords.clear();
        
        // 为每个单词添加详细信息
        for (const word of wordsArray) {
          const wordData = {
            word: word,
            pronunciation: `/${word}/`,
            translation: '待查询',
            ai_explanation: '暂无AI解释',
            example_sentence: '',
            sentence_translation: ''
          };
          
          // 重新添加到favoriteWords（现在会包含详细信息）
          this.favoriteWords.add(word);
          migratedCount++;
        }
        
        // 保存到文件
        this.saveToFile();
        
        return { 
          success: true, 
          message: `成功为 ${migratedCount} 个单词添加详细信息`, 
          migratedCount 
        };
      } catch (error) {
        console.error('文件存储数据迁移失败:', error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * 获取收藏单词总数
   * @returns {number} 收藏单词数量
   */
  getWordCount() {
    if (this.useSQLite && this.db) {
      // SQLite 模式
      try {
        const stmt = this.db.prepare(`
          SELECT COUNT(*) as count FROM favorite_words
        `);
        
        const result = stmt.get();
        return result.count || 0;
      } catch (error) {
        console.error('获取单词数量失败:', error);
        return 0;
      }
    } else {
      // 文件存储模式
      return this.favoriteWords.size;
    }
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.useSQLite && this.db) {
      this.db.close();
      this.db = null;
      console.log('SQLite 数据库连接已关闭');
    } else {
      console.log('文件存储模式，无需关闭连接');
    }
  }

  /**
   * 获取数据库路径
   */
  getDbPath() {
    return this.useSQLite ? this.dbPath : this.fileStoragePath;
  }

  /**
   * 备份数据库
   * @param {string} backupPath - 备份文件路径
   */
  backup(backupPath) {
    if (this.useSQLite && this.db) {
      // SQLite 模式
      try {
        this.db.backup(backupPath);
        return { success: true, message: `SQLite 数据库已备份至: ${backupPath}` };
      } catch (error) {
        console.error('SQLite 数据库备份失败:', error);
        return { success: false, error: error.message };
      }
    } else {
      // 文件存储模式
      try {
        if (fs.existsSync(this.fileStoragePath)) {
          fs.copyFileSync(this.fileStoragePath, backupPath);
          return { success: true, message: `收藏文件已备份至: ${backupPath}` };
        } else {
          return { success: false, error: '源文件不存在' };
        }
      } catch (error) {
        console.error('文件备份失败:', error);
        return { success: false, error: error.message };
      }
    }
  }
}

module.exports = FavoriteWordsDB;