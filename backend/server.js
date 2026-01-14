const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置中间件
app.use(cors());
app.use(express.json());

// 连接数据库
const db = new sqlite3.Database('./votes.db', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the votes database.');
    // 创建表结构
    createTables();
  }
});

// 创建数据库表
function createTables() {
  // 创建polls表
  db.run(`CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 创建options表
  db.run(`CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
  )`);

  // 创建votes表
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL,
    ip_address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE
  )`);
}

// API路由

// 获取所有投票列表
app.get('/api/polls', (req, res) => {
  db.all(`SELECT id, title, description, created_at FROM polls ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 创建新投票
app.post('/api/polls', (req, res) => {
  const { title, description, options } = req.body;
  
  if (!title || !options || options.length < 2) {
    res.status(400).json({ error: 'Title and at least 2 options are required.' });
    return;
  }

  // 开始事务
  db.serialize(() => {
    // 插入poll
    db.run(`INSERT INTO polls (title, description) VALUES (?, ?)`, [title, description], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const pollId = this.lastID;
      const optionPromises = [];
      
      // 插入options
      options.forEach(optionText => {
        optionPromises.push(new Promise((resolve, reject) => {
          db.run(`INSERT INTO options (poll_id, text) VALUES (?, ?)`, [pollId, optionText], function(err) {
            if (err) reject(err);
            else resolve();
          });
        }));
      });
      
      Promise.all(optionPromises)
        .then(() => {
          res.status(201).json({ id: pollId, message: 'Poll created successfully.' });
        })
        .catch(err => {
          res.status(500).json({ error: err.message });
        });
    });
  });
});

// 获取单个投票详情
app.get('/api/polls/:id', (req, res) => {
  const pollId = req.params.id;
  
  // 获取poll信息
  db.get(`SELECT id, title, description, created_at FROM polls WHERE id = ?`, [pollId], (err, poll) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!poll) {
      res.status(404).json({ error: 'Poll not found.' });
      return;
    }
    
    // 获取options
    db.all(`SELECT id, text FROM options WHERE poll_id = ?`, [pollId], (err, options) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({ ...poll, options });
    });
  });
});

// 提交投票
app.post('/api/polls/:id/vote', (req, res) => {
  const pollId = req.params.id;
  const { option_id } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  if (!option_id) {
    res.status(400).json({ error: 'Option ID is required.' });
    return;
  }
  
  // 检查用户是否已经投票
  db.get(`SELECT id FROM votes WHERE poll_id = ? AND ip_address = ?`, [pollId, ipAddress], (err, vote) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (vote) {
      res.status(400).json({ error: 'You have already voted on this poll.' });
      return;
    }
    
    // 检查选项是否存在
    db.get(`SELECT id FROM options WHERE id = ? AND poll_id = ?`, [option_id, pollId], (err, option) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (!option) {
        res.status(404).json({ error: 'Option not found.' });
        return;
      }
      
      // 插入投票
      db.run(`INSERT INTO votes (poll_id, option_id, ip_address) VALUES (?, ?, ?)`, [pollId, option_id, ipAddress], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        res.status(201).json({ message: 'Vote submitted successfully.' });
      });
    });
  });
});

// 获取投票结果
app.get('/api/polls/:id/results', (req, res) => {
  const pollId = req.params.id;
  
  // 获取poll信息
  db.get(`SELECT id, title, description FROM polls WHERE id = ?`, [pollId], (err, poll) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!poll) {
      res.status(404).json({ error: 'Poll not found.' });
      return;
    }
    
    // 获取选项和投票计数
    db.all(`
      SELECT o.id, o.text, COUNT(v.id) as vote_count
      FROM options o
      LEFT JOIN votes v ON o.id = v.option_id AND v.poll_id = ?
      WHERE o.poll_id = ?
      GROUP BY o.id, o.text
      ORDER BY vote_count DESC
    `, [pollId, pollId], (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // 计算总票数
      const totalVotes = results.reduce((sum, option) => sum + option.vote_count, 0);
      
      res.json({
        ...poll,
        results,
        totalVotes
      });
    });
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

// 关闭数据库连接
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Closed the database connection.');
    }
    process.exit(0);
  });
});