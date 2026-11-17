require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { Server } = require('socket.io');

const db = require('./data/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 50 * 1024 * 1024 // 50MB
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aechat_super_secret_key_2026';

// Upload Directory
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Sanitize filename and add unique prefix
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    cb(null, `${uniqueSuffix}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Robots.txt to prevent any search engine crawling (Privacy protection)
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nDisallow: /');
});

// Auth Middleware
function authMiddleware(req, res, next) {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  } else if (req.cookies && req.cookies.aechat_token) {
    token = req.cookies.aechat_token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findUserById(decoded.id);
    if (!user || user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Tài khoản không hợp lệ hoặc đã bị khóa' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Phiên làm việc hết hạn' });
  }
}

// Admin Middleware
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền này' });
  }
  next();
}

// ==================== AUTH & INVITE ROUTES ====================

// Check invite key validity
app.get('/api/invite/check/:key', (req, res) => {
  const { key } = req.params;
  const invite = db.findInviteByKey(key);
  if (!invite) {
    return res.json({ valid: false, message: 'Mã mời không tồn tại' });
  }
  if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
    return res.json({ valid: false, message: 'Mã mời này đã hết lượt sử dụng' });
  }
  return res.json({ valid: true, label: invite.label, key: invite.key });
});

// Register user (Requires valid invite key)
app.post('/api/auth/register', (req, res) => {
  const { inviteKey, username, displayName, password, avatar, avatarColor } = req.body;

  if (!inviteKey || !username || !displayName || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ success: false, message: 'Tên đăng nhập phải từ 3 đến 20 ký tự' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' });
  }

  // Validate invite
  const invite = db.findInviteByKey(inviteKey);
  if (!invite) {
    return res.status(400).json({ success: false, message: 'Mã mời không hợp lệ' });
  }
  if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
    return res.status(400).json({ success: false, message: 'Mã mời đã hết lượt sử dụng' });
  }

  // Check username taken
  if (db.findUserByUsername(username)) {
    return res.status(400).json({ success: false, message: 'Tên đăng nhập đã được sử dụng' });
  }

  // Create user
  const newUser = db.createUser({
    username,
    displayName,
    password,
    avatar: avatar || '👤',
    avatarColor: avatarColor || '#2b5278',
    role: 'member'
  });

  // Consume invite
  db.useInvite(inviteKey);

  // Generate Token
  const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, {
    expiresIn: '30d'
  });

  res.cookie('aechat_token', token, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000 });

  const { password: _, ...safeUser } = newUser;
  return res.json({
    success: true,
    message: 'Chào mừng bạn đến với AECHAT!',
    token,
    user: safeUser
  });
});

// Login user
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
  }

  const user = db.findUserByUsername(username);
  if (!user) {
    return res.status(400).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa bởi Admin' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '30d'
  });

  res.cookie('aechat_token', token, { httpOnly: true, maxAge: 30 * 24 * 3600 * 1000 });

  const { password: _, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'Đăng nhập thành công',
    token,
    user: safeUser
  });
});

// Get current user info
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('aechat_token');
  res.json({ success: true, message: 'Đã đăng xuất' });
});

// ==================== UPLOAD ROUTE ====================
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Chưa có file nào được tải lên' });
  }

  const mime = req.file.mimetype;
  const isImage = mime.startsWith('image/');
  const isVideo = mime.startsWith('video/');
  const isAudio = mime.startsWith('audio/');

  let fileType = 'file';
  if (isImage) fileType = 'image';
  else if (isVideo) fileType = 'video';
  else if (isAudio) fileType = 'audio';

  const fileData = {
    url: `/uploads/${req.file.filename}`,
    filename: req.file.originalname,
    size: req.file.size,
    type: fileType,
    mimetype: mime
  };

  return res.json({ success: true, file: fileData });
});

// ==================== CHAT API ROUTES ====================

// Get messages for a group room
app.get('/api/messages/room/:roomId', authMiddleware, (req, res) => {
  const { roomId } = req.params;
  const messages = db.getMessagesForRoom(roomId);
  res.json({ success: true, messages });
});

// Get direct messages with another user
app.get('/api/messages/direct/:targetUserId', authMiddleware, (req, res) => {
  const { targetUserId } = req.params;
  const targetUser = db.findUserById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
  }
  const messages = db.getDirectMessages(req.user.id, targetUserId);
  res.json({ success: true, messages, targetUser: { id: targetUser.id, displayName: targetUser.displayName, avatar: targetUser.avatar, avatarColor: targetUser.avatarColor } });
});

// List all active members for chat directory
app.get('/api/users/list', authMiddleware, (req, res) => {
  const users = db.getAllUsers(true)
    .filter(u => u.status === 'active' && u.id !== req.user.id);
  res.json({ success: true, users });
});

// ==================== ADMIN API ROUTES ====================

app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, stats });
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.getAllUsers(true);
  res.json({ success: true, users });
});

app.post('/api/admin/users/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'blocked'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
  }
  const updated = db.updateUserStatus(id, status);
  if (!updated) {
    return res.status(400).json({ success: false, message: 'Không thể cập nhật tài khoản này (hoặc là Admin)' });
  }
  res.json({ success: true, message: 'Đã cập nhật trạng thái' });
});

app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteUser(id);
  if (!deleted) {
    return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản này' });
  }
  res.json({ success: true, message: 'Đã xóa người dùng' });
});

app.get('/api/admin/invites', authMiddleware, adminMiddleware, (req, res) => {
  const invites = db.getAllInvites();
  res.json({ success: true, invites });
});

app.post('/api/admin/invites', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { key, label, maxUses } = req.body;
    const invite = db.createInvite({ key, label, maxUses, createdBy: req.user.username });
    res.json({ success: true, invite });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/invites/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  db.deleteInvite(id);
  res.json({ success: true, message: 'Đã xóa mã mời' });
});

// ==================== WEBSOCKET REAL-TIME LOGIC ====================
const onlineUsers = new Map(); // userId -> { socketId, username, displayName, avatar, avatarColor }

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findUserById(decoded.id);
    if (!user || user.status === 'blocked') {
      return next(new Error('User not found or blocked'));
    }
    socket.user = user;
    next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.user;
  onlineUsers.set(user.id, {
    socketId: socket.id,
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    avatarColor: user.avatarColor
  });

  // Broadcast online presence
  io.emit('presence:update', Array.from(onlineUsers.keys()));

  // Join default General room
  socket.join('room:general');

  // Handle joining custom rooms or DM
  socket.on('join:room', (roomId) => {
    socket.join(`room:${roomId}`);
  });

  // Handle typing indicator
  socket.on('chat:typing', ({ roomId, directTo, isTyping }) => {
    if (directTo) {
      const recipient = onlineUsers.get(directTo);
      if (recipient) {
        io.to(recipient.socketId).emit('chat:user_typing', {
          senderId: user.id,
          senderName: user.displayName,
          isTyping,
          directTo
        });
      }
    } else {
      socket.to(`room:${roomId || 'general'}`).emit('chat:user_typing', {
        roomId: roomId || 'general',
        senderId: user.id,
        senderName: user.displayName,
        isTyping
      });
    }
  });

  // Handle sending new message
  socket.on('chat:send', (msgData, callback) => {
    const { roomId, directTo, content, attachment } = msgData;

    if (!content && !attachment) {
      if (callback) callback({ success: false, error: 'Tin nhắn rỗng' });
      return;
    }

    const savedMessage = db.createMessage({
      roomId: directTo ? null : (roomId || 'general'),
      senderId: user.id,
      senderName: user.displayName,
      senderAvatar: user.avatar,
      senderColor: user.avatarColor,
      content,
      attachment,
      directTo
    });

    if (directTo) {
      // 1-1 Direct message: Send to recipient and sender
      const recipient = onlineUsers.get(directTo);
      if (recipient) {
        io.to(recipient.socketId).emit('chat:message', savedMessage);
      }
      socket.emit('chat:message', savedMessage);
    } else {
      // Group room message: Broadcast to room
      io.to(`room:${roomId || 'general'}`).emit('chat:message', savedMessage);
    }

    if (callback) callback({ success: true, message: savedMessage });
  });

  // Handle message deletion
  socket.on('chat:delete', ({ messageId }, callback) => {
    const isAdmin = user.role === 'admin';
    const deleted = db.deleteMessage(messageId, user.id, isAdmin);
    if (deleted) {
      io.emit('chat:message_deleted', { messageId });
      if (callback) callback({ success: true });
    } else {
      if (callback) callback({ success: false, error: 'Không thể xóa tin nhắn' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(user.id);
    io.emit('presence:update', Array.from(onlineUsers.keys()));
  });
});

// Single Page Application routing fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [AECHAT] Hệ thống Chat Bảo Mật đang chạy tại:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`👑 Tài khoản Admin mặc định: admin / admin123`);
  console.log(`🔑 Mã mời mẫu: ANHEM2026`);
  console.log(`======================================================\n`);
});
