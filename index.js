const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const util = require('util');
const crypto = require('crypto');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');


dotenv.config();

const {
  sendVerificationEmail,
  sendResetEmail,
  renderVerificationSuccessPage,
  renderVerificationErrorPage
} = require('./mailer');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_key_123';
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// =========================
// DATABASE CONNECTION
// =========================
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'account17_db'
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to MySQL database');
  }
});

const query = util.promisify(connection.query).bind(connection);



// =========================
// MIDDLEWARE
// =========================
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.protocol}://${req.get('host')}${req.originalUrl} : ${moment().format()}`);
  next();
};

app.use(cors());
app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// STATIC UPLOADS
// =========================
const uploadsRoot = path.join(__dirname, 'uploads');
const profileDir = path.join(uploadsRoot, 'profile');
const accountDir = path.join(uploadsRoot, 'account');

if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot);
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir);
if (!fs.existsSync(accountDir)) fs.mkdirSync(accountDir);

app.use('/uploads', express.static(uploadsRoot));

// =========================
// FILE UPLOAD SETUP
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profile_image') {
      cb(null, profileDir);
    } else if (file.fieldname === 'account_image') {
      cb(null, accountDir);
    } else {
      cb(null, uploadsRoot);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_');

    cb(null, `${Date.now()}-${safeName}${ext}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only JPG, JPEG, PNG, and WEBP files are allowed.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const profileUpload = upload.single('profile_image');
const accountUpload = upload.single('account_image');

// =========================
// HELPERS
// =========================
const blacklistedTokens = new Set();

const generateRandomToken = () => crypto.randomBytes(32).toString('hex');

const deleteFileIfExists = (relativePath) => {
  if (!relativePath) return;

  const cleaned = relativePath.replace(/^\/+/, '');
  const fullPath = path.join(__dirname, cleaned);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

const publicFileUrl = (req, relativePath) => {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  return `${req.protocol}://${req.get('host')}${relativePath}`;
};


// =========================
// AUTH MIDDLEWARE
// =========================
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    if (blacklistedTokens.has(token)) {
      return res.status(401).json({ message: 'Token is already logged out.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const rows = await query(
      'SELECT user_id, username, fullname, email, profile_image, token, is_verified FROM users WHERE user_id = ? AND token = ? LIMIT 1',
      [decoded.user_id, token]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    if (!rows[0].is_verified) {
      return res.status(403).json({ message: 'Account is not verified.' });
    }

    req.user = rows[0];
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// =========================
// REGISTER
// POST /api/register
// =========================
app.post('/api/register', async (req, res) => {
  try {
    const { username, fullname, email, password } = req.body;

    if (!username || !fullname || !email || !password) {
      return res.status(400).json({
        message: 'username, fullname, email, and password are required.'
      });
    }

    const existing = await query(
      'SELECT user_id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: 'Username or email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateRandomToken();

    await query(
      `INSERT INTO users 
      (username, fullname, email, password, profile_image, token, is_verified, verification_token, reset_token, reset_token_expires)
      VALUES (?, ?, ?, ?, NULL, '', 0, ?, NULL, NULL)`,
      [username, fullname, email, hashedPassword, verificationToken]
    );

    await sendVerificationEmail(email, fullname, verificationToken);

    return res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to register user.',
      error: error.message
    });
  }
});

// =========================
// VERIFY EMAIL
// GET /api/verify-email?token=...
// =========================
app.get('/api/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(renderVerificationErrorPage());
    }

    const rows = await query(
      'SELECT user_id, is_verified FROM users WHERE verification_token = ? LIMIT 1',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).send(renderVerificationErrorPage());
    }

    await query(
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE user_id = ?',
      [rows[0].user_id]
    );

    return res.status(200).send(renderVerificationSuccessPage());
  } catch (error) {
    return res.status(500).send(renderVerificationErrorPage());
  }
});

// =========================
// LOGIN
// POST /api/login
// =========================
app.post('/api/login', async (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.username || req.body.email;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: 'username/email and password are required.'
      });
    }

    const rows = await query(
      'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
      [identifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid login credentials.'
      });
    }

    const user = rows[0];

    if (!user.is_verified) {
      return res.status(403).json({
        message: 'Your account is not verified. Please verify your email first.'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid login credentials.'
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    await query('UPDATE users SET token = ? WHERE user_id = ?', [token, user.user_id]);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        profile_image: publicFileUrl(req, user.profile_image)
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Login failed.',
      error: error.message
    });
  }
});

// =========================
// LOGOUT
// POST /api/logout
// =========================
app.post('/api/logout', verifyToken, async (req, res) => {
  try {
    await query('UPDATE users SET token = ? WHERE user_id = ?', ['', req.user.user_id]);
    blacklistedTokens.add(req.token);

    return res.status(200).json({
      message: 'Logout successful.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Logout failed.',
      error: error.message
    });
  }
});

// =========================
// FORGOT PASSWORD
// POST /api/forgot-password
// =========================
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required.'
      });
    }

    const rows = await query(
      'SELECT user_id, fullname, email FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const resetToken = generateRandomToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

      await query(
        'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE user_id = ?',
        [resetToken, resetExpires, user.user_id]
      );

      await sendResetEmail(user.email, user.fullname, resetToken);
    }

    return res.status(200).json({
      message: 'If the email exists, a password reset link has been sent.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Forgot password failed.',
      error: error.message
    });
  }
});

// =========================
// RESET PASSWORD
// POST /api/reset-password
// =========================
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: 'token and newPassword are required.'
      });
    }

    const rows = await query(
      'SELECT user_id FROM users WHERE reset_token = ? AND reset_token_expires > NOW() LIMIT 1',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: 'Reset token is invalid or expired.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL, token = ? WHERE user_id = ?',
      [hashedPassword, '', rows[0].user_id]
    );

    return res.status(200).json({
      message: 'Password has been reset successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Reset password failed.',
      error: error.message
    });
  }
});

// =========================
// GET PROFILE
// GET /api/profile
// =========================
app.get('/api/profile', verifyToken, async (req, res) => {
  try {
    const rows = await query(
      'SELECT user_id, username, fullname, email, profile_image, is_verified, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Profile not found.'
      });
    }

    const user = rows[0];
    user.profile_image = publicFileUrl(req, user.profile_image);

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch profile.',
      error: error.message
    });
  }
});

// =========================
// UPDATE PROFILE
// PUT /api/profile
// =========================
app.put('/api/profile', verifyToken, (req, res) => {
  profileUpload(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        return res.status(400).json({
          message: uploadErr.message
        });
      }

      const currentRows = await query(
        'SELECT * FROM users WHERE user_id = ? LIMIT 1',
        [req.user.user_id]
      );

      if (currentRows.length === 0) {
        return res.status(404).json({
          message: 'User not found.'
        });
      }

      const currentUser = currentRows[0];

      const username = req.body.username || currentUser.username;
      const fullname = req.body.fullname || currentUser.fullname;
      const email = req.body.email || currentUser.email;

      const duplicateRows = await query(
        'SELECT user_id FROM users WHERE (username = ? OR email = ?) AND user_id <> ?',
        [username, email, req.user.user_id]
      );

      if (duplicateRows.length > 0) {
        if (req.file) deleteFileIfExists(`/uploads/profile/${req.file.filename}`);
        return res.status(409).json({
          message: 'Username or email is already in use.'
        });
      }

      let hashedPassword = currentUser.password;
      if (req.body.password && req.body.password.trim() !== '') {
        hashedPassword = await bcrypt.hash(req.body.password, 10);
      }

      let profileImagePath = currentUser.profile_image;
      if (req.file) {
        if (currentUser.profile_image) {
          deleteFileIfExists(currentUser.profile_image);
        }
        profileImagePath = `/uploads/profile/${req.file.filename}`;
      }

      await query(
        `UPDATE users 
         SET username = ?, fullname = ?, email = ?, password = ?, profile_image = ?
         WHERE user_id = ?`,
        [username, fullname, email, hashedPassword, profileImagePath, req.user.user_id]
      );

      const updatedRows = await query(
        'SELECT user_id, username, fullname, email, profile_image, is_verified, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1',
        [req.user.user_id]
      );

      const updatedUser = updatedRows[0];
      updatedUser.profile_image = publicFileUrl(req, updatedUser.profile_image);

      return res.status(200).json({
        message: 'Profile updated successfully.',
        user: updatedUser
      });
    } catch (error) {
      if (req.file) deleteFileIfExists(`/uploads/profile/${req.file.filename}`);
      return res.status(500).json({
        message: 'Failed to update profile.',
        error: error.message
      });
    }
  });
});

// =========================
// CREATE ACCOUNT ITEM
// POST /api/account
// =========================
app.post('/api/account', verifyToken, (req, res) => {
  accountUpload(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        return res.status(400).json({
          message: uploadErr.message
        });
      }

      const site = req.body.site;
      const accountUsername = req.body.account_username || req.body.username;
      const accountPassword = req.body.account_password || req.body.password;
      const accountImage = req.file ? `/uploads/account/${req.file.filename}` : null;

      if (!site || !accountUsername || !accountPassword) {
        if (accountImage) deleteFileIfExists(accountImage);
        return res.status(400).json({
          message: 'site, username, and password are required.'
        });
      }

      const duplicateRows = await query(
        `SELECT account_id
         FROM account_items
         WHERE user_id = ? AND site = ? AND account_username = ?
         LIMIT 1`,
        [req.user.user_id, site, accountUsername]
      );

      if (duplicateRows.length > 0) {
        if (accountImage) deleteFileIfExists(accountImage);
        return res.status(409).json({
          message: 'This account item already exists for this user.'
        });
      }

      const result = await query(
        `INSERT INTO account_items
         (user_id, site, account_username, account_password, account_image)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.user_id, site, accountUsername, accountPassword, accountImage]
      );

      return res.status(201).json({
        message: 'Account item created successfully.',
        account_id: result.insertId
      });
    } catch (error) {
      if (req.file) deleteFileIfExists(`/uploads/account/${req.file.filename}`);
      return res.status(500).json({
        message: 'Failed to create account item.',
        error: error.message
      });
    }
  });
});

// =========================
// GET ALL ACCOUNT ITEMS
// GET /api/account
// =========================
app.get('/api/account', verifyToken, async (req, res) => {
  try {
    const rows = await query(
      `SELECT account_id, user_id, site, account_username, account_password, account_image, created_at, updated_at
       FROM account_items
       WHERE user_id = ?
       ORDER BY account_id DESC`,
      [req.user.user_id]
    );

    const data = rows.map((item) => ({
      ...item,
      account_image: publicFileUrl(req, item.account_image)
    }));

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch account items.',
      error: error.message
    });
  }
});

// =========================
// GET ONE ACCOUNT ITEM
// GET /api/account/:id
// =========================
app.get('/api/account/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT account_id, user_id, site, account_username, account_password, account_image, created_at, updated_at
       FROM account_items
       WHERE account_id = ? AND user_id = ?
       LIMIT 1`,
      [id, req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Account item not found.'
      });
    }

    const item = rows[0];
    item.account_image = publicFileUrl(req, item.account_image);

    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch account item.',
      error: error.message
    });
  }
});

// =========================
// UPDATE ACCOUNT ITEM
// PUT /api/account/:id
// =========================
app.put('/api/account/:id', verifyToken, (req, res) => {
  accountUpload(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        return res.status(400).json({
          message: uploadErr.message
        });
      }

      const { id } = req.params;

      const currentRows = await query(
        'SELECT * FROM account_items WHERE account_id = ? AND user_id = ? LIMIT 1',
        [id, req.user.user_id]
      );

      if (currentRows.length === 0) {
        if (req.file) deleteFileIfExists(`/uploads/account/${req.file.filename}`);
        return res.status(404).json({
          message: 'Account item not found.'
        });
      }

      const currentItem = currentRows[0];

      const site = req.body.site || currentItem.site;
      const accountUsername = req.body.account_username || req.body.username || currentItem.account_username;
      const accountPassword = req.body.account_password || req.body.password || currentItem.account_password;

      let accountImage = currentItem.account_image;
      if (req.file) {
        if (currentItem.account_image) {
          deleteFileIfExists(currentItem.account_image);
        }
        accountImage = `/uploads/account/${req.file.filename}`;
      }

      await query(
        `UPDATE account_items
         SET site = ?, account_username = ?, account_password = ?, account_image = ?
         WHERE account_id = ? AND user_id = ?`,
        [site, accountUsername, accountPassword, accountImage, id, req.user.user_id]
      );

      return res.status(200).json({
        message: 'Account item updated successfully.'
      });
    } catch (error) {
      if (req.file) deleteFileIfExists(`/uploads/account/${req.file.filename}`);
      return res.status(500).json({
        message: 'Failed to update account item.',
        error: error.message
      });
    }
  });
});

// =========================
// DELETE ACCOUNT ITEM
// DELETE /api/account/:id
// =========================
app.delete('/api/account/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      'SELECT * FROM account_items WHERE account_id = ? AND user_id = ? LIMIT 1',
      [id, req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Account item not found.'
      });
    }

    const item = rows[0];

    if (item.account_image) {
      deleteFileIfExists(item.account_image);
    }

    await query(
      'DELETE FROM account_items WHERE account_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    return res.status(200).json({
      message: 'Account item deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete account item.',
      error: error.message
    });
  }
});

// =========================
// DEFAULT
// =========================
app.get('/', (req, res) => {
  res.json({
    message: 'Activity 17 API is running.'
  });
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});