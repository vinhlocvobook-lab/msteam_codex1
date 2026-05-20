# Project Work Hub

MVP cho ứng dụng quản lý project/task nội bộ, có định hướng tích hợp Microsoft Teams ở các phase sau.

## Chức năng trong bản đầu

- Dashboard tổng quan project, task vướng mắc và message chờ phân loại.
- Quản lý khái niệm project, stage, task, priority.
- Mô phỏng Work Intake cho message Teams lẫn nhiều project/giai đoạn.
- Schema MariaDB cho app chính và mapping Teams message vào task/project.

## Cấu trúc

```text
apps/api      Node.js/Express API
apps/web      React/Vite frontend
database      MariaDB schema
```

## Chạy local

```bash
npm install
npm run dev:api
npm run dev:web
```

Hoặc chạy cả hai bằng:

```bash
npm run dev
```

API mặc định chạy ở `http://127.0.0.1:4001`.
Frontend mặc định chạy ở `http://localhost:5173`.

## Cấu hình môi trường

Tạo cấu hình local từ các file mẫu:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Các file `.env` không được commit lên GitHub. Bạn điền các giá trị Microsoft Entra ID, Microsoft Graph và database thật trong các file local này.

Biến chính của API:

- `HOST`, `PORT`, `WEB_ORIGINS`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_GRAPH_BASE_URL`
- `TEAMS_SYNC_ENABLED`, `TEAMS_SYNC_LOOKBACK_DAYS`, `TEAMS_WEBHOOK_PUBLIC_URL`

Biến chính của web:

- `VITE_API_BASE_URL`
- `VITE_MICROSOFT_TENANT_ID`
- `VITE_MICROSOFT_CLIENT_ID`
- `VITE_MICROSOFT_REDIRECT_URI`
- `VITE_MICROSOFT_POST_LOGOUT_REDIRECT_URI`

## Bước tiếp theo

1. Thêm CRUD project/stage/task.
2. Thêm Microsoft SSO bằng MSAL.
3. Thêm module Teams Sources và Mapping Wizard.
4. Thêm backfill/sync Teams message.

## Database

Kiểm tra kết nối MariaDB:

```bash
npm run db:ping --workspace apps/api
```

Tạo/cập nhật schema:

```bash
npm run db:migrate --workspace apps/api
```
