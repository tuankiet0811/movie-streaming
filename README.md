# StreamLine — Movie Streaming Web App

## Giới thiệu
Ứng dụng web streaming phim xây dựng với Node.js + Express, render EJS, dữ liệu MongoDB Atlas. Hỗ trợ đăng ký/đăng nhập, khám phá phim theo thể loại/ngôn ngữ/năm/đánh giá, danh sách yêu thích, lịch sử xem, đánh giá và bình luận, thích đánh giá/bình luận, thông báo realtime bằng Socket.io, và trang quản trị.

## Kiến trúc
- Server: Express app khởi tạo tại `app.js`, lắng nghe cổng 3000.
- MVC nhẹ:
  - Controllers: `apps/controllers` định tuyến và render EJS.
  - Services: `apps/Services` gom logic nghiệp vụ và điều phối transaction.
  - Repository: `apps/Repository` thao tác MongoDB (movie, ratings, users...).
- Views: EJS tại `apps/views`, static đặt dưới `/public`.
- Cấu hình: `Config/Setting.json` (MongoDB, JWT).
- Xác thực: JWT lưu trong cookie `token`, middleware kiểm tra tại `apps/Util/VerifyWebToken.js`.

## Tính năng chính
- Auth: đăng ký, đăng nhập, đăng xuất (JWT cookie).
- Khám phá: lọc theo thể loại, đánh giá tối thiểu, năm, loại media, quốc gia, từ khóa.
- Xem chi tiết & xem phim; TV hỗ trợ seasons/episodes.
- Wishlist (yêu thích), lịch sử xem tự động.
- Đánh giá (1–10), bình luận, sửa trong 24h, thích review và thích reply.
- Thông báo realtime bằng Socket.io (join theo email).
- Admin dashboard: thống kê người dùng, phim, lượt xem, rating trung bình; quản lý phim/thể loại/đánh giá.

## Yêu cầu
- Node.js 18+ (khuyến nghị LTS).
- MongoDB Atlas (hoặc MongoDB tương thích). 

## Tech Stack

Backend
- Node.js
- Express.js
- MongoDB Atlas

Frontend
- EJS
- Bootstrap

Realtime
- Socket.io

Authentication
- JWT

## Cài đặt & chạy
```bash
# 1) Cài dependency
npm install

# 2) Cấu hình
# - Cách A (khuyên dùng): tạo .env và map vào runtime
# - Cách B: chỉnh Config/Setting.json (không khuyến khích commit thông tin nhạy cảm)

# 3) Chạy server (hiện không có script start)
node app.js
# server chạy tại http://localhost:3000
```

## Scripts
```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1",
  "start": "node app.js"
}
```

## Endpoints chính
- Public pages:
  - `GET /` → nếu có JWT chuyển `home`, nếu không render landing.
  - `GET /home` → trang chủ, trend, thể loại nổi bật.
  - `GET /home/discover` → khám phá với filter (page, genres[], rating, year, mediaType, country, keyword).
  - `GET /movie` → liệt kê phim phân trang.
  - `GET /movie/detail?id=...` → chi tiết, rating, bình luận, seasons/episodes cho TV.
  - `GET /movie/watch?id=...` → trang xem, ghi lịch sử xem (nếu login).
- Actions cần đăng nhập:
  - `POST /movie/favorite/toggle` → bật/tắt yêu thích.
  - `POST /movie/rate` → đánh giá 1–10, kèm bình luận.
  - `POST /movie/review/like` → thích review.
  - `POST /movie/review/reply/like` → thích reply.
  - `POST /movie/review/reply` → thêm reply.
  - `POST /movie/review/edit` → sửa review (giới hạn 24h).
  - `POST /movie/review/reply/edit` → sửa reply (chỉ chủ sở hữu).
- Auth:
  - `GET /auth/login`, `POST /auth/login`
  - `GET /auth/register`, `POST /auth/register`
  - `GET /auth/logout`
- Admin:
  - `GET /admin` → dashboard
  - `GET /admin/usermanage` → quản lý người dùng
  - `/admin/moviemanage`, `/admin/categorymanage`, `/admin/reviewmanage` (controllers con)

## Socket.io
- Server tạo channel theo email; client nên emit:
```js
socket.emit("join", userEmail)
```
- Server phát sự kiện `notification` tới room email khi có thích review/reply hoặc thêm phim mới.

## Cấu trúc thư mục
```text
Config/
  Setting.json            # cấu hình MongoDB, JWT
apps/
  Database/Database.js    # kết nối MongoClient
  Entity/                 # entity mô tả dữ liệu
  Repository/             # lớp truy xuất dữ liệu (movie, users, ...)
  Services/               # logic nghiệp vụ, transaction, notification
  Util/                   # middleware token
  controllers/            # định tuyến Express, render EJS
  model/                  # model người dùng
  views/                  # EJS templates
public/                   # tài nguyên tĩnh (css, js, images, scss admin theme)
app.js                    # khởi tạo app, static, view engine, socket.io
package.json              # dependencies
```

## Bảo mật & môi trường
- Không commit thông tin nhạy cảm (DB user/password, JWT secret). Dùng biến môi trường và vault/secrets.
- CORS: socket.io mở `origin: "*"`, tự cân nhắc giới hạn theo domain triển khai.
- Cookie HTTPOnly cho JWT; thêm Secure/SameSite trong môi trường production.
