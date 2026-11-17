// AECHAT Client Application
(function () {
  'use strict';

  // State
  let currentUser = null;
  let authToken = localStorage.getItem('aechat_token') || null;
  let socket = null;
  let activeChat = {
    type: 'room',
    id: 'general',
    title: 'Hội Anh Em 🚀',
    avatar: '🚀',
    color: '#2b5278'
  };
  let onlineUsers = new Set();
  let directoryUsers = [];
  let typingTimeout = null;

  // DOM Elements - Views
  const viewGatekeeper = document.getElementById('view-gatekeeper');
  const viewRegister = document.getElementById('view-register');
  const viewLogin = document.getElementById('view-login');
  const appLayout = document.getElementById('app-layout');

  // DOM Elements - Gatekeeper & Auth
  const inputGatekeeperKey = document.getElementById('input-gatekeeper-key');
  const btnUnlockInvite = document.getElementById('btn-unlock-invite');
  const btnGoLogin = document.getElementById('btn-go-login');
  const btnLoginBack = document.getElementById('btn-login-back');
  const formRegister = document.getElementById('form-register');
  const formLogin = document.getElementById('form-login');
  const spanInviteKey = document.getElementById('span-invite-key');
  let selectedAvatar = '😎';

  // DOM Elements - Chat UI
  const messagesContainer = document.getElementById('messages-container');
  const chatTextInput = document.getElementById('chat-text-input');
  const btnSendMessage = document.getElementById('btn-send-message');
  const btnAttach = document.getElementById('btn-attach');
  const fileInput = document.getElementById('file-input');
  const typingIndicator = document.getElementById('typing-indicator');
  const activeChatTitle = document.getElementById('active-chat-title');
  const activeChatStatus = document.getElementById('active-chat-status');
  const activeChatAvatar = document.getElementById('active-chat-avatar');
  const directUsersList = document.getElementById('direct-users-list');
  const myAvatar = document.getElementById('my-avatar');
  const btnLogout = document.getElementById('btn-logout');
  const btnOpenAdmin = document.getElementById('btn-open-admin');
  const sidebar = document.getElementById('sidebar');
  const btnBackSidebar = document.getElementById('btn-back-sidebar');
  const chatItemGeneral = document.getElementById('chat-item-general');
  const inputSearchChats = document.getElementById('input-search-chats');
  const btnOpenMedia = document.getElementById('btn-open-media');
  const chatHeaderClickable = document.getElementById('chat-header-clickable');

  // DOM Elements - Shared Media Modal
  const modalMedia = document.getElementById('modal-media');
  const btnCloseMedia = document.getElementById('btn-close-media');
  const mediaModalTitle = document.getElementById('media-modal-title');
  const galleryImagesGrid = document.getElementById('gallery-images-grid');
  const listMediaFiles = document.getElementById('list-media-files');
  const countMediaImages = document.getElementById('count-media-images');
  const countMediaFiles = document.getElementById('count-media-files');
  const emptyMediaImages = document.getElementById('empty-media-images');
  const emptyMediaFiles = document.getElementById('empty-media-files');
  const tabMediaImages = document.getElementById('tab-media-images');
  const tabMediaFiles = document.getElementById('tab-media-files');

  // DOM Elements - Admin Modal
  const modalAdmin = document.getElementById('modal-admin');
  const btnCloseAdmin = document.getElementById('btn-close-admin');
  const modalTabs = document.querySelectorAll('.modal-tab');
  const tabInvites = document.getElementById('tab-invites');
  const tabMembers = document.getElementById('tab-members');
  const tabStats = document.getElementById('tab-stats');
  const btnCreateInvite = document.getElementById('btn-create-invite');
  const adminInviteKey = document.getElementById('admin-invite-key');
  const adminInviteMax = document.getElementById('admin-invite-max');
  const adminInviteLabel = document.getElementById('admin-invite-label');
  const tableInvitesBody = document.getElementById('table-invites-body');
  const tableMembersBody = document.getElementById('table-members-body');
  const statUsers = document.getElementById('stat-users');
  const statMessages = document.getElementById('stat-messages');
  const statFiles = document.getElementById('stat-files');
  const statInvites = document.getElementById('stat-invites');

  // DOM Elements - Lightbox
  const modalLightbox = document.getElementById('modal-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');
  const btnZoomToggle = document.getElementById('btn-zoom-toggle');
  const btnOpenNewtab = document.getElementById('btn-open-newtab');
  const btnDownloadImg = document.getElementById('btn-download-img');

  // ==================== AUDIO SYNTHESIZER ====================
  // Synthesizes pleasant sounds using Web Audio API (Zero external audio file dependencies)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playSendSound() {
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  }

  function playReceiveSound() {
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.setValueAtTime(880, now + 0.08); // A5
      osc2.frequency.setValueAtTime(440, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch (e) {}
  }

  // ==================== VIEW SWITCHING ====================
  function showView(viewName) {
    viewGatekeeper.style.display = 'none';
    viewRegister.style.display = 'none';
    viewLogin.style.display = 'none';
    appLayout.style.display = 'none';

    if (viewName === 'gatekeeper') viewGatekeeper.style.display = 'flex';
    else if (viewName === 'register') viewRegister.style.display = 'flex';
    else if (viewName === 'login') viewLogin.style.display = 'flex';
    else if (viewName === 'chat') appLayout.style.display = 'flex';
  }

  // ==================== APP INITIALIZATION ====================
  async function initApp() {
    // Check URL parameters for invite key
    const urlParams = new URLSearchParams(window.location.search);
    const keyParam = urlParams.get('key') || urlParams.get('invite');

    if (keyParam) {
      // Validate invite from URL
      const isValid = await checkInviteKey(keyParam);
      if (isValid) {
        spanInviteKey.textContent = keyParam.toUpperCase();
        showView('register');
        return;
      }
    }

    // Check existing login session
    if (authToken) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          currentUser = data.user;
          setupChatSession();
          return;
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    }

    // Default to Gatekeeper lock screen
    showView('gatekeeper');
  }

  async function checkInviteKey(key) {
    try {
      const res = await fetch(`/api/invite/check/${encodeURIComponent(key.trim())}`);
      const data = await res.json();
      return data.valid;
    } catch (err) {
      return false;
    }
  }

  // ==================== GATEKEEPER & AUTH HANDLERS ====================
  btnUnlockInvite.addEventListener('click', async () => {
    const key = inputGatekeeperKey.value.trim();
    if (!key) {
      alert('Vui lòng nhập mã mời');
      return;
    }
    const isValid = await checkInviteKey(key);
    if (isValid) {
      spanInviteKey.textContent = key.toUpperCase();
      showView('register');
    } else {
      alert('Mã mời không tồn tại hoặc đã hết lượt sử dụng!');
    }
  });

  btnGoLogin.addEventListener('click', () => showView('login'));
  btnLoginBack.addEventListener('click', () => showView('gatekeeper'));

  // Avatar selector logic
  document.querySelectorAll('.avatar-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedAvatar = opt.getAttribute('data-avatar');
    });
  });

  // Register Form Submit
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inviteKey = spanInviteKey.textContent.trim();
    const username = document.getElementById('reg-username').value.trim();
    const displayName = document.getElementById('reg-displayname').value.trim();
    const password = document.getElementById('reg-password').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteKey,
          username,
          displayName,
          password,
          avatar: selectedAvatar
        })
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Đăng ký thất bại');
        return;
      }

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('aechat_token', authToken);

      // Clean URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

      setupChatSession();
    } catch (err) {
      alert('Có lỗi xảy ra khi kết nối máy chủ');
    }
  });

  // Login Form Submit
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Đăng nhập thất bại');
        return;
      }

      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('aechat_token', authToken);

      setupChatSession();
    } catch (err) {
      alert('Có lỗi xảy ra khi kết nối máy chủ');
    }
  });

  // Logout
  btnLogout.addEventListener('click', async () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi AECHAT?')) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
      localStorage.removeItem('aechat_token');
      authToken = null;
      currentUser = null;
      if (socket) socket.disconnect();
      showView('gatekeeper');
    }
  });

  // ==================== CHAT SESSION SETUP ====================
  function setupChatSession() {
    showView('chat');

    // Display current user avatar & Admin button if admin
    myAvatar.textContent = currentUser.avatar || '👤';
    myAvatar.style.backgroundColor = currentUser.avatarColor || '#2b5278';
    myAvatar.title = `${currentUser.displayName} (@${currentUser.username})`;

    if (currentUser.role === 'admin') {
      btnOpenAdmin.style.display = 'flex';
    } else {
      btnOpenAdmin.style.display = 'none';
    }

    // Connect Socket.io
    connectSocket();

    // Load initial room messages
    switchChat('room', 'general', 'Hội Anh Em 🚀', '🚀', '#2b5278');

    // Fetch contacts/directory
    loadDirectoryUsers();
  }

  // Socket Connection
  function connectSocket() {
    if (socket) socket.disconnect();

    socket = io({
      auth: { token: authToken }
    });

    socket.on('connect', () => {
      console.log('⚡ [AECHAT] Kết nối WebSocket thành công');
      updateHeaderStatus();
    });

    socket.on('presence:update', (activeIds) => {
      onlineUsers = new Set(activeIds);
      renderDirectoryUsers();
      updateHeaderStatus();
    });

    socket.on('chat:message', (msg) => {
      // Check if message belongs to current active conversation
      const isForCurrentChat =
        (activeChat.type === 'room' && msg.roomId === activeChat.id) ||
        (activeChat.type === 'direct' &&
          ((msg.senderId === activeChat.id && msg.directTo === currentUser.id) ||
           (msg.senderId === currentUser.id && msg.directTo === activeChat.id)));

      if (isForCurrentChat) {
        appendMessage(msg);
        scrollToBottom();
      }

      // Update previews
      updateSidebarPreview(msg);

      // Play audio notification
      if (msg.senderId !== currentUser.id) {
        playReceiveSound();
      }
    });

    socket.on('chat:message_deleted', ({ messageId }) => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) el.remove();
    });

    socket.on('chat:user_typing', ({ senderId, senderName, isTyping, directTo, roomId }) => {
      if (activeChat.type === 'room' && roomId === activeChat.id && senderId !== currentUser.id) {
        typingIndicator.textContent = isTyping ? `${senderName} đang soạn tin nhắn...` : '';
      } else if (activeChat.type === 'direct' && activeChat.id === senderId) {
        typingIndicator.textContent = isTyping ? `${senderName} đang soạn tin nhắn...` : '';
      }
    });

    socket.on('disconnect', () => {
      activeChatStatus.textContent = 'Mất kết nối, đang thử lại...';
      activeChatStatus.classList.remove('online');
    });
  }

  // ==================== MESSAGING & CHAT RENDERING ====================
  async function switchChat(type, id, title, avatar, color) {
    activeChat = { type, id, title, avatar, color };

    // Update Header
    activeChatTitle.textContent = title;
    activeChatAvatar.textContent = avatar;
    activeChatAvatar.style.backgroundColor = color || '#2b5278';
    updateHeaderStatus();

    // Clear messages and typing indicator
    messagesContainer.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:20px; font-size:13px;">Đang tải lịch sử trò chuyện...</div>';
    typingIndicator.textContent = '';

    // Mark active in sidebar
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    const targetItem = document.querySelector(`.chat-item[data-id="${id}"]`);
    if (targetItem) targetItem.classList.add('active');

    // On mobile, hide sidebar when chat is selected
    if (window.innerWidth <= 768) {
      sidebar.classList.add('hidden-mobile');
    }

    // Fetch messages from API
    try {
      let endpoint = `/api/messages/room/${id}`;
      if (type === 'direct') {
        endpoint = `/api/messages/direct/${id}`;
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();

      messagesContainer.innerHTML = '';
      if (data.success && data.messages) {
        if (data.messages.length === 0) {
          messagesContainer.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:30px; font-size:13px;">Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên! 👋</div>';
        } else {
          data.messages.forEach(msg => appendMessage(msg));
          scrollToBottom(false);
        }
      }
    } catch (err) {
      messagesContainer.innerHTML = '<div style="text-align:center; color:var(--danger-color); padding:20px;">Không thể tải tin nhắn</div>';
    }
  }

  function appendMessage(msg) {
    if (!msg || !msg.id) return;
    // Ngăn chặn lặp lại tin nhắn
    if (document.getElementById(`msg-${msg.id}`)) return;

    const isOut = msg.senderId === currentUser.id;
    const timeStr = formatTime(msg.createdAt);

    const bubble = document.createElement('div');
    bubble.id = `msg-${msg.id}`;
    bubble.className = `message-bubble ${isOut ? 'message-outgoing' : 'message-incoming'}`;

    let attachmentHtml = '';
    if (msg.attachment) {
      if (msg.attachment.type === 'image') {
        attachmentHtml = `
          <img src="${msg.attachment.url}" class="attachment-image" alt="Ảnh đính kèm" onclick="window.viewImage('${msg.attachment.url}')">
        `;
      } else {
        const sizeStr = formatFileSize(msg.attachment.size);
        attachmentHtml = `
          <a href="${msg.attachment.url}" download="${msg.attachment.filename}" class="attachment-file" target="_blank">
            <span class="file-icon">📄</span>
            <div class="file-info">
              <div class="file-name">${escapeHTML(msg.attachment.filename)}</div>
              <div class="file-size">${sizeStr}</div>
            </div>
            <span class="file-download-icon">⬇️</span>
          </a>
        `;
      }
    }

    const canDelete = isOut || currentUser.role === 'admin';
    const deleteBtnHtml = canDelete ? `<button class="msg-delete-btn" onclick="window.deleteMessage('${msg.id}')" title="Xóa tin nhắn">🗑️</button>` : '';

    bubble.innerHTML = `
      ${!isOut && activeChat.type === 'room' ? `<div class="msg-sender-name">${escapeHTML(msg.senderName)}</div>` : ''}
      ${msg.content ? `<div class="msg-text">${escapeHTML(msg.content)}</div>` : ''}
      ${attachmentHtml}
      <div class="msg-footer">
        ${deleteBtnHtml}
        <span>${timeStr}</span>
        ${isOut ? '<span>✓✓</span>' : ''}
      </div>
    `;

    messagesContainer.appendChild(bubble);
  }

  function scrollToBottom(smooth = true) {
    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  let isSendingMessage = false;
  let isIMEComposing = false;

  // Send Message Event
  function handleSendMessage() {
    if (isSendingMessage) return; // Chống bấm liên tiếp hoặc lặp lệnh gửi

    const text = chatTextInput.value.trim();
    if (!text) return;

    isSendingMessage = true;
    chatTextInput.value = '';
    chatTextInput.style.height = 'auto';

    const payload = {
      content: text,
      roomId: activeChat.type === 'room' ? activeChat.id : null,
      directTo: activeChat.type === 'direct' ? activeChat.id : null
    };

    socket.emit('chat:send', payload, (res) => {
      if (res && res.success) {
        playSendSound();
      }
    });

    setTimeout(() => {
      isSendingMessage = false;
    }, 400);

    // Stop typing
    emitTyping(false);
  }

  btnSendMessage.addEventListener('click', handleSendMessage);

  // Theo dõi trạng thái gõ tiếng Việt có dấu (Unikey / EVKey / Telex macOS)
  chatTextInput.addEventListener('compositionstart', () => {
    isIMEComposing = true;
  });

  chatTextInput.addEventListener('compositionend', () => {
    isIMEComposing = false;
  });

  chatTextInput.addEventListener('keydown', (e) => {
    // Nếu đang trong quá trình gõ ghép chữ tiếng Việt -> Tuyệt đối không gửi
    if (isIMEComposing || e.isComposing || e.keyCode === 229) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      emitTyping(true);
    }
  });

  // Auto-resize textarea when typing multi-line
  chatTextInput.addEventListener('input', () => {
    chatTextInput.style.height = 'auto';
    chatTextInput.style.height = Math.min(chatTextInput.scrollHeight, 120) + 'px';
  });

  // Hỗ trợ Dán ảnh trực tiếp từ Clipboard (Ctrl+V / Cmd+V hoặc chụp màn hình dán vào)
  let isProcessingPaste = false;
  async function handlePaste(e) {
    if (isProcessingPaste) return;
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    // 1. Kiểm tra files (copy ảnh từ Finder/Explorer/Screenshot)
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type && file.type.startsWith('image/')) {
          e.preventDefault();
          isProcessingPaste = true;
          setTimeout(() => { isProcessingPaste = false; }, 800);
          await uploadAndSendFile(file);
          return;
        }
      }
    }

    // 2. Kiểm tra items (ảnh copy từ trình duyệt hoặc bộ nhớ tạm)
    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type && item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            isProcessingPaste = true;
            setTimeout(() => { isProcessingPaste = false; }, 800);
            const timestamp = Date.now();
            let ext = 'png';
            if (file.type === 'image/jpeg') ext = 'jpg';
            else if (file.type === 'image/webp') ext = 'webp';
            else if (file.type === 'image/gif') ext = 'gif';
            const safeFile = new File([file], `anh_goc_${timestamp}.${ext}`, { type: file.type || 'image/png' });
            await uploadAndSendFile(safeFile);
            return;
          }
        }
      }
    }
  }

  // Chỉ gắn 1 listener duy nhất trên window để chống sự kiện nổi bọt (bubbling) gây trùng 2 lần
  window.addEventListener('paste', handlePaste);

  // Tìm kiếm danh sách cuộc trò chuyện và danh bạ tức thì
  if (inputSearchChats) {
    inputSearchChats.addEventListener('input', (e) => {
      const q = (e.target.value || '').toLowerCase().trim();
      if (chatItemGeneral) {
        chatItemGeneral.style.display = 'hội anh em 🚀'.includes(q) ? 'flex' : 'none';
      }
      document.querySelectorAll('#direct-users-list .chat-item').forEach(item => {
        const name = (item.querySelector('.chat-item-name')?.textContent || '').toLowerCase();
        item.style.display = name.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Hỗ trợ Kéo & Thả (Drag & Drop) ảnh/file trực tiếp vào cửa sổ chat
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        await uploadAndSendFile(e.dataTransfer.files[i]);
      }
    }
  });

  // Typing debounce
  function emitTyping(isTyping) {
    if (!socket) return;
    socket.emit('chat:typing', {
      roomId: activeChat.type === 'room' ? activeChat.id : null,
      directTo: activeChat.type === 'direct' ? activeChat.id : null,
      isTyping
    });

    if (typingTimeout) clearTimeout(typingTimeout);
    if (isTyping) {
      typingTimeout = setTimeout(() => {
        emitTyping(false);
      }, 2500);
    }
  }

  // Global window delete message handler
  window.deleteMessage = function (messageId) {
    if (confirm('Bạn có muốn xóa tin nhắn này?')) {
      socket.emit('chat:delete', { messageId });
    }
  };

  // Global window view image lightbox handler (Giữ nguyên 100% độ nét gốc)
  window.viewImage = function (url) {
    if (!url) return;
    lightboxImg.src = url;
    lightboxImg.classList.remove('zoomed-orig');
    if (btnZoomToggle) btnZoomToggle.textContent = '🔍 Kích Thước Gốc 1:1';
    if (btnOpenNewtab) btnOpenNewtab.href = url;
    if (btnDownloadImg) {
      btnDownloadImg.href = url;
      btnDownloadImg.download = url.split('/').pop() || 'photo_original.png';
    }
    modalLightbox.style.display = 'flex';
  };

  if (btnZoomToggle) {
    btnZoomToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isZoomed = lightboxImg.classList.toggle('zoomed-orig');
      btnZoomToggle.textContent = isZoomed ? '🔎 Thu Nhỏ Vừa Khung' : '🔍 Kích Thước Gốc 1:1';
    });
  }

  btnCloseLightbox.addEventListener('click', () => {
    modalLightbox.style.display = 'none';
  });
  modalLightbox.addEventListener('click', (e) => {
    // Only close if clicked on backdrop, not on toolbar
    if (e.target === modalLightbox || e.target.id === 'lightbox-img-container') {
      modalLightbox.style.display = 'none';
    }
  });

  // ==================== FILE & IMAGE UPLOAD ====================
  btnAttach.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await uploadAndSendFile(file);
    }
    fileInput.value = '';
  });

  async function uploadAndSendFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:80px;right:20px;background:#2b5278;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
    toast.textContent = `Đang tải lên: ${file.name}...`;
    document.body.appendChild(toast);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();
      toast.remove();

      if (data.success && data.file) {
        socket.emit('chat:send', {
          content: '',
          attachment: data.file,
          roomId: activeChat.type === 'room' ? activeChat.id : null,
          directTo: activeChat.type === 'direct' ? activeChat.id : null
        }, () => {
          playSendSound();
        });
      } else {
        alert('Tải file thất bại: ' + (data.message || 'Lỗi không xác định'));
      }
    } catch (err) {
      toast.remove();
      alert('Lỗi tải file lên máy chủ');
    }
  }

  // ==================== DIRECT CONTACTS DIRECTORY ====================
  async function loadDirectoryUsers() {
    try {
      const res = await fetch('/api/users/list', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && data.users) {
        directoryUsers = data.users;
        renderDirectoryUsers();
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  }

  function renderDirectoryUsers() {
    directUsersList.innerHTML = '';
    directoryUsers.forEach(u => {
      const isOnline = onlineUsers.has(u.id);
      const item = document.createElement('div');
      item.className = 'chat-item';
      item.setAttribute('data-id', u.id);
      item.setAttribute('data-type', 'direct');

      item.innerHTML = `
        <div class="chat-item-avatar" style="background-color: ${u.avatarColor || '#242f3d'};">
          ${u.avatar || '👤'}
          <span class="status-dot ${isOnline ? '' : 'offline'}"></span>
        </div>
        <div class="chat-item-info">
          <div class="chat-item-header">
            <span class="chat-item-name">${escapeHTML(u.displayName)}</span>
          </div>
          <div class="chat-item-preview">${isOnline ? '🟢 Đang trực tuyến' : 'Ngoại tuyến'}</div>
        </div>
      `;

      item.addEventListener('click', () => {
        switchChat('direct', u.id, u.displayName, u.avatar || '👤', u.avatarColor || '#242f3d');
      });

      directUsersList.appendChild(item);
    });
  }

  chatItemGeneral.addEventListener('click', () => {
    switchChat('room', 'general', 'Hội Anh Em 🚀', '🚀', '#2b5278');
  });

  // Mobile Back Button
  btnBackSidebar.addEventListener('click', () => {
    sidebar.classList.remove('hidden-mobile');
  });

  function updateHeaderStatus() {
    if (activeChat.type === 'room') {
      const count = onlineUsers.size;
      activeChatStatus.textContent = `${count} thành viên đang trực tuyến`;
      activeChatStatus.classList.add('online');
    } else {
      const isOnline = onlineUsers.has(activeChat.id);
      activeChatStatus.textContent = isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến';
      if (isOnline) activeChatStatus.classList.add('online');
      else activeChatStatus.classList.remove('online');
    }
  }

  function updateSidebarPreview(msg) {
    const previewText = msg.attachment ? (msg.attachment.type === 'image' ? '📷 Hình ảnh' : '📁 Tệp tin') : msg.content;
    const timeStr = formatTime(msg.createdAt);

    if (msg.roomId === 'general' && !msg.directTo) {
      const p = document.getElementById('general-preview');
      const t = document.getElementById('general-time');
      if (p) p.textContent = `${msg.senderName}: ${previewText}`;
      if (t) t.textContent = timeStr;
    }
  }

  // ==================== ADMIN PANEL LOGIC ====================
  btnOpenAdmin.addEventListener('click', () => {
    loadAdminData();
    modalAdmin.style.display = 'flex';
  });

  btnCloseAdmin.addEventListener('click', () => {
    modalAdmin.style.display = 'none';
  });

  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modalTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');
      tabInvites.style.display = target === 'tab-invites' ? 'block' : 'none';
      tabMembers.style.display = target === 'tab-members' ? 'block' : 'none';
      tabStats.style.display = target === 'tab-stats' ? 'block' : 'none';
    });
  });

  async function loadAdminData() {
    loadAdminInvites();
    loadAdminMembers();
    loadAdminStats();
  }

  async function loadAdminInvites() {
    try {
      const res = await fetch('/api/admin/invites', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        tableInvitesBody.innerHTML = '';
        data.invites.forEach(inv => {
          const tr = document.createElement('tr');
          const fullInviteUrl = `${window.location.origin}/?key=${encodeURIComponent(inv.key)}`;
          tr.innerHTML = `
            <td><strong style="color:var(--accent-hover);">${inv.key}</strong></td>
            <td>${escapeHTML(inv.label || 'Không có')}</td>
            <td>${inv.usedCount} / ${inv.maxUses === 0 ? 'Vô hạn' : inv.maxUses}</td>
            <td>
              <button class="btn-xs btn-copy-xs" onclick="window.copyInviteLink('${fullInviteUrl}')">Sao Chép Link</button>
              <button class="btn-xs btn-danger-xs" onclick="window.deleteAdminInvite('${inv.id}')">Xóa</button>
            </td>
          `;
          tableInvitesBody.appendChild(tr);
        });
      }
    } catch (e) {}
  }

  btnCreateInvite.addEventListener('click', async () => {
    const key = adminInviteKey.value.trim();
    const maxUses = adminInviteMax.value || 1;
    const label = adminInviteLabel.value.trim();

    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ key, maxUses, label })
      });
      const data = await res.json();
      if (data.success) {
        adminInviteKey.value = '';
        adminInviteLabel.value = '';
        loadAdminInvites();
        loadAdminStats();
      } else {
        alert(data.message || 'Lỗi tạo mã mời');
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ');
    }
  });

  window.copyInviteLink = function (url) {
    navigator.clipboard.writeText(url).then(() => {
      alert(`Đã sao chép đường link mời bí mật:\n${url}\n\nHãy gửi link này cho người bạn muốn mời vào chat!`);
    });
  };

  window.deleteAdminInvite = async function (id) {
    if (confirm('Xóa mã mời này?')) {
      await fetch(`/api/admin/invites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      loadAdminInvites();
      loadAdminStats();
    }
  };

  async function loadAdminMembers() {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        tableMembersBody.innerHTML = '';
        data.users.forEach(u => {
          const tr = document.createElement('tr');
          const isAdmin = u.role === 'admin';
          tr.innerHTML = `
            <td>${u.avatar} <b>${escapeHTML(u.displayName)}</b> (@${u.username})</td>
            <td>${isAdmin ? '👑 Admin' : 'Thành viên'}</td>
            <td><span style="color:${u.status === 'active' ? 'var(--online-color)' : 'var(--danger-color)'}; font-weight:600;">${u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</span></td>
            <td>
              ${!isAdmin ? `
                <button class="btn-xs ${u.status === 'active' ? 'btn-danger-xs' : 'btn-copy-xs'}" onclick="window.toggleUserStatus('${u.id}', '${u.status === 'active' ? 'blocked' : 'active'}')">
                  ${u.status === 'active' ? 'Khóa nick' : 'Mở khóa'}
                </button>
                <button class="btn-xs btn-danger-xs" onclick="window.deleteAdminUser('${u.id}')">Xóa</button>
              ` : '<span style="color:var(--text-secondary);font-size:12px;">Chủ phòng</span>'}
            </td>
          `;
          tableMembersBody.appendChild(tr);
        });
      }
    } catch (e) {}
  }

  window.toggleUserStatus = async function (id, status) {
    await fetch(`/api/admin/users/${id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ status })
    });
    loadAdminMembers();
  };

  window.deleteAdminUser = async function (id) {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này? Người này sẽ bị kick khỏi phòng chat vĩnh viễn.')) {
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      loadAdminMembers();
      loadAdminStats();
      loadDirectoryUsers();
    }
  };

  async function loadAdminStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && data.stats) {
        statUsers.textContent = data.stats.totalUsers;
        statMessages.textContent = data.stats.totalMessages;
        statFiles.textContent = data.stats.totalFiles;
        statInvites.textContent = data.stats.totalInvites;
      }
    } catch (e) {}
  }

  // ==================== SHARED MEDIA GALLERY LOGIC ====================
  function openSharedMediaModal() {
    if (mediaModalTitle) mediaModalTitle.textContent = `📁 Kho Media: ${activeChat.title}`;
    if (modalMedia) modalMedia.style.display = 'flex';
    loadSharedMedia();
  }

  if (btnOpenMedia) {
    btnOpenMedia.addEventListener('click', openSharedMediaModal);
  }
  if (chatHeaderClickable) {
    chatHeaderClickable.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'btn-back-sidebar') return;
      openSharedMediaModal();
    });
  }

  if (btnCloseMedia) {
    btnCloseMedia.addEventListener('click', () => {
      modalMedia.style.display = 'none';
    });
  }
  if (modalMedia) {
    modalMedia.addEventListener('click', (e) => {
      if (e.target === modalMedia) {
        modalMedia.style.display = 'none';
      }
    });
  }

  // Media tabs switching
  document.querySelectorAll('[data-mediatab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-mediatab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-mediatab');
      if (tabMediaImages) tabMediaImages.style.display = target === 'tab-media-images' ? 'block' : 'none';
      if (tabMediaFiles) tabMediaFiles.style.display = target === 'tab-media-files' ? 'block' : 'none';
    });
  });

  async function loadSharedMedia() {
    if (!galleryImagesGrid || !listMediaFiles) return;
    galleryImagesGrid.innerHTML = '';
    listMediaFiles.innerHTML = '';
    if (countMediaImages) countMediaImages.textContent = '...';
    if (countMediaFiles) countMediaFiles.textContent = '...';
    if (emptyMediaImages) emptyMediaImages.style.display = 'none';
    if (emptyMediaFiles) emptyMediaFiles.style.display = 'none';

    try {
      const res = await fetch(`/api/media/${activeChat.type}/${activeChat.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!data.success) return;

      const { images, files } = data.media;

      if (countMediaImages) countMediaImages.textContent = images.length;
      if (countMediaFiles) countMediaFiles.textContent = files.length;

      // Render images grid
      if (images.length === 0) {
        if (emptyMediaImages) emptyMediaImages.style.display = 'block';
      } else {
        images.forEach(img => {
          const card = document.createElement('div');
          card.className = 'gallery-card';
          card.innerHTML = `
            <img src="${img.url}" alt="${escapeHTML(img.filename)}" loading="lazy">
            <div class="gallery-card-info">
              <span>${escapeHTML(img.senderName)}</span>
              <span>${formatTime(img.createdAt)}</span>
            </div>
          `;
          card.addEventListener('click', () => {
            window.viewImage(img.url);
          });
          galleryImagesGrid.appendChild(card);
        });
      }

      // Render files list
      if (files.length === 0) {
        if (emptyMediaFiles) emptyMediaFiles.style.display = 'block';
      } else {
        files.forEach(f => {
          const fileCard = document.createElement('a');
          fileCard.href = f.url;
          fileCard.download = f.filename;
          fileCard.target = '_blank';
          fileCard.className = 'attachment-file';
          fileCard.innerHTML = `
            <span class="file-icon">📄</span>
            <div class="file-info">
              <div class="file-name">${escapeHTML(f.filename)}</div>
              <div class="file-size">${formatFileSize(f.size)} • Gửi bởi ${escapeHTML(f.senderName)} (${formatTime(f.createdAt)})</div>
            </div>
            <span class="file-download-icon" title="Tải xuống">⬇️</span>
          `;
          listMediaFiles.appendChild(fileCard);
        });
      }
    } catch (err) {
      console.error('Error loading media gallery:', err);
    }
  }

  // ==================== UTILITIES ====================
  function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on start
  initApp();

})();
