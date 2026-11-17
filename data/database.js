const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data_storage');
const DB_FILE = path.join(DATA_DIR, 'aechat_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Database Structure
const initialData = {
  users: [],
  invites: [],
  messages: [],
  rooms: [
    {
      id: 'general',
      name: 'Hội Anh Em 🚀',
      description: 'Phòng chat chung cho tất cả thành viên AECHAT',
      isGroup: true,
      createdAt: new Date().toISOString()
    }
  ],
  settings: {
    appName: 'AECHAT',
    allowDirectMessages: true
  }
};

class Database {
  constructor() {
    this.data = this.load();
    this.ensureDefaultAdminAndInvite();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('Error loading database, initializing new one:', err);
    }
    this.save(initialData);
    return JSON.parse(JSON.stringify(initialData));
  }

  save(data = this.data) {
    try {
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
      this.data = data;
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  ensureDefaultAdminAndInvite() {
    // Chỉ cho phép đúng 2 tài khoản duy nhất: handsome0121 và loc123123
    const salt = bcrypt.genSaltSync(10);
    const hashHandsome = bcrypt.hashSync('123123', salt);
    const hashLoc = bcrypt.hashSync('123123loc', salt);

    let existingHandsome = this.data.users.find(u => u.username === 'handsome0121');
    let existingLoc = this.data.users.find(u => u.username === 'loc123123');

    // Mặc định tên Lộc là mã 623749 theo yêu cầu, hoặc giữ tên mới nếu người dùng đã đổi
    const locDisplayName = (existingLoc && existingLoc.displayName && existingLoc.displayName !== 'Lộc')
      ? existingLoc.displayName
      : '623749';
    const locAvatar = (existingLoc && existingLoc.avatar) || '😎';

    const handsomeDisplayName = (existingHandsome && existingHandsome.displayName) || 'Handsome';
    const handsomeAvatar = (existingHandsome && existingHandsome.avatar) || '👑';

    const handsomeUser = {
      id: existingHandsome ? existingHandsome.id : 'usr_handsome',
      username: 'handsome0121',
      displayName: handsomeDisplayName,
      password: hashHandsome,
      role: 'admin',
      avatar: handsomeAvatar,
      avatarColor: '#2b5278',
      status: 'active',
      createdAt: existingHandsome ? existingHandsome.createdAt : new Date().toISOString()
    };

    const locUser = {
      id: existingLoc ? existingLoc.id : 'usr_loc',
      username: 'loc123123',
      displayName: locDisplayName,
      password: hashLoc,
      role: 'member',
      avatar: locAvatar,
      avatarColor: '#2b5278',
      status: 'active',
      createdAt: existingLoc ? existingLoc.createdAt : new Date().toISOString()
    };

    // Đặt lại danh sách thành viên chỉ có đúng 2 tài khoản này
    this.data.users = [handsomeUser, locUser];
    this.data.invites = []; // Xoá sạch toàn bộ mã mời

    console.log(`🔒 [AECHAT] Hệ thống đã khóa độc quyền 2 tài khoản: handsome0121 & loc123123 (Tên: ${locDisplayName})`);
    this.save();
  }

  // --- USER METHODS ---
  findUserByUsername(username) {
    if (!username) return null;
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  createUser({ username, displayName, password, avatar, avatarColor, role = 'member' }) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      password: hashedPassword,
      role,
      avatar: avatar || '👤',
      avatarColor: avatarColor || '#242f3d',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  getAllUsers(excludePasswords = true) {
    return this.data.users.map(u => {
      if (excludePasswords) {
        const { password, ...safeUser } = u;
        return safeUser;
      }
      return u;
    });
  }

  updateUserStatus(id, status) {
    const user = this.findUserById(id);
    if (user && user.role !== 'admin') {
      user.status = status;
      this.save();
      return true;
    }
    return false;
  }

  updateUserProfile(id, { displayName, avatar }) {
    const user = this.findUserById(id);
    if (user) {
      if (displayName) user.displayName = displayName.trim();
      if (avatar) user.avatar = avatar;
      this.save();
      return user;
    }
    return null;
  }

  deleteUser(id) {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index !== -1 && this.data.users[index].role !== 'admin') {
      this.data.users.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // --- INVITE METHODS ---
  findInviteByKey(key) {
    if (!key) return null;
    return this.data.invites.find(i => i.key.toUpperCase() === key.toUpperCase().trim());
  }

  createInvite({ key, label, maxUses = 1, createdBy = 'admin' }) {
    const cleanKey = (key || Math.random().toString(36).substring(2, 8).toUpperCase()).toUpperCase().trim();
    if (this.findInviteByKey(cleanKey)) {
      throw new Error('Mã mời này đã tồn tại!');
    }
    const newInvite = {
      id: `inv_${Date.now()}`,
      key: cleanKey,
      label: label || 'Lời mời riêng tư',
      maxUses: Number(maxUses) || 1,
      usedCount: 0,
      createdBy,
      createdAt: new Date().toISOString()
    };
    this.data.invites.push(newInvite);
    this.save();
    return newInvite;
  }

  useInvite(key) {
    const invite = this.findInviteByKey(key);
    if (!invite) return false;
    if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) return false;
    invite.usedCount += 1;
    this.save();
    return true;
  }

  deleteInvite(id) {
    const index = this.data.invites.findIndex(i => i.id === id);
    if (index !== -1) {
      this.data.invites.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  getAllInvites() {
    return this.data.invites;
  }

  // --- MESSAGE METHODS ---
  createMessage({ roomId, senderId, senderName, senderAvatar, senderColor, content, attachment, directTo }) {
    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      roomId: roomId || 'general',
      senderId,
      senderName,
      senderAvatar,
      senderColor,
      content: content || '',
      attachment: attachment || null, // { url, filename, size, type: 'image'|'file' }
      directTo: directTo || null, // null for group, userId for 1-1 direct message
      createdAt: new Date().toISOString()
    };
    this.data.messages.push(newMsg);
    this.save();
    return newMsg;
  }

  getMessagesForRoom(roomId = 'general', limit = 150) {
    return this.data.messages
      .filter(m => m.roomId === roomId && !m.directTo)
      .slice(-limit);
  }

  getDirectMessages(user1Id, user2Id, limit = 150) {
    return this.data.messages
      .filter(m => {
        return (
          (m.senderId === user1Id && m.directTo === user2Id) ||
          (m.senderId === user2Id && m.directTo === user1Id)
        );
      })
      .slice(-limit);
  }

  deleteMessage(messageId, userId, isAdmin = false) {
    const index = this.data.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      const msg = this.data.messages[index];
      if (isAdmin || msg.senderId === userId) {
        this.data.messages.splice(index, 1);
        this.save();
        return true;
      }
    }
    return false;
  }

  // --- STATS ---
  getStats() {
    return {
      totalUsers: this.data.users.length,
      totalMessages: this.data.messages.length,
      totalInvites: this.data.invites.length,
      totalFiles: this.data.messages.filter(m => !!m.attachment).length
    };
  }
}

module.exports = new Database();
