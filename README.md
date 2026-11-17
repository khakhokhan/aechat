# ✈️ AECHAT - Không Gian Trò Chuyện Riêng Tư Chuẩn Telegram

Ứng dụng Web Chat phong cách Telegram bảo mật cao dành cho hội nhóm riêng tư. Chỉ những ai có **Liên kết mời bí mật (Secret Invite Link)** từ Admin mới có thể đăng ký và tham gia.

---

## 🌟 Tính Năng Nổi Bật

1. **🎨 Giao diện Telegram Web Dark Theme:**
   - Bong bóng tin nhắn thời gian thực, âm thanh gửi nhận mượt mà.
   - Nhóm chung "Hội Anh Em 🚀" + Nhắn tin riêng 1-1 trực tiếp giữa các thành viên.
   - Trạng thái trực tuyến (Online chấm xanh), thông báo đang soạn tin nhắn ("... đang nhập").
2. **🔒 Kiểm Soát Truy Cập Khép Kín ("Chỉ ai bạn muốn mới được dùng"):**
   - Người lạ vào trang chủ bị chặn bởi **Màn hình khóa (Gatekeeper)**.
   - Không cho phép người lạ tự ý đăng ký.
   - Chỉ người nhận được **Link mời có mã bí mật** (ví dụ: `https://.../?key=ANHEM2026`) mới mở được trang tạo tài khoản.
   - Bot tìm kiếm của Google bị chặn hoàn toàn (`robots.txt: Disallow /` và `noindex`).
3. **📎 Lưu Trữ & Đa Phương Tiện:**
   - Gửi ảnh trực tiếp (JPG, PNG, GIF, WebP) với tính năng bấm phóng to toàn màn hình (Lightbox).
   - Gửi tài liệu, tệp tin nén (PDF, Word, Excel, ZIP, RAR...) kèm tên file, dung lượng và nút tải về 1 chạm.
   - Kéo thả file trực tiếp vào khung chat.
4. **👑 Bảng Điều Khiển Admin:**
   - Đăng nhập tài khoản `admin` để mở bảng điều khiển.
   - Tạo các Link mời mới (tùy chỉnh số lượt dùng: 1 lần, 5 lần, hoặc vô hạn).
   - Nút **Sao chép Link mời 1-chạm** để gửi ngay qua Zalo/Facebook/Tin nhắn cho bạn bè.
   - Quản lý thành viên: Xem danh sách, Khóa nick (Block), Xóa tài khoản (Kick vĩnh viễn).
   - Xóa tin nhắn bất kỳ.

---

## 🚀 Chạy Thử Trên Máy Tính (Local)

1. Mở Terminal và di chuyển vào thư mục:
   ```bash
   cd aechat
   npm start
   ```
2. Mở trình duyệt truy cập:
   - 👉 **http://localhost:3000**
3. Tài khoản Admin khởi tạo:
   - **Tên đăng nhập:** `admin`
   - **Mật khẩu:** `admin123`
4. Mã mời khởi tạo cho thành viên:
   - **Mã:** `ANHEM2026`
   - **Link mời trực tiếp:** `http://localhost:3000/?key=ANHEM2026`

---

## ☁️ Hướng Dẫn Deploy Lên Render.com (Chạy 24/7 Miễn Phí, GitHub Private)

### Bước 1: Đẩy mã nguồn lên GitHub (Chế độ Private)
1. Truy cập [github.com/new](https://github.com/new) và tạo 1 kho chứa mới:
   - Tên kho: `aechat`
   - **Chọn chế độ: Private (Riêng tư)** 🔒
   - Bấm **Create repository**.
2. Trong thư mục `aechat` trên máy bạn, chạy các lệnh:
   ```bash
   git init
   git add .
   git commit -m "feat: Khoi tao AECHAT"
   git branch -M main
   git remote add origin <LINK_GITHUB_CUA_BAN>
   git push -u origin main
   ```

### Bước 2: Kết nối với Render.com
1. Đăng ký/Đăng nhập tại [render.com](https://render.com).
2. Bấm nút **New +** ở góc phải -> Chọn **Web Service**.
3. Chọn kho lưu trữ GitHub `aechat` (chế độ Private) mà bạn vừa tạo ở Bước 1.
4. Cấu hình cài đặt (Render sẽ tự động điền sẵn):
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
5. Bấm nút **Create Web Service**.

### Bước 3: Nhận Link & Sử Dụng
- Sau khoảng 1-2 phút, Render sẽ cấp cho bạn một link dạng:  
  `https://aechat-xxxx.onrender.com`
- Bạn mở link đó lên, đăng nhập tài khoản `admin / admin123`.
- Bấm vào biểu tượng vương miện **👑 Admin**, bấm nút **Tạo Link Mời** và gửi link bí mật đó cho người bạn muốn cho dùng!
