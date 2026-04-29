# Mimir — backend API

REST API for personal finance management: users, expenses, wallet and lent money, reports, auth (including Google OAuth), email flows, and admin utilities.

## Table of contents

1. [What the API covers](#what-the-api-covers)
2. [Project structure](#project-structure)
3. [Technology stack](#technology-stack)
4. [Run locally](#run-locally)
5. [Run with Docker](#run-with-docker)
6. [Scripts](#scripts)
7. [API endpoints](#api-endpoints)
8. [Environment variables](#environment-variables)
9. [Contributing](#contributing)

## What the API covers

- **Authentication**: registration, login, Google sign-in, JWT sessions, password reset and account verification links sent by email, logout, active session listing and revocation.
- **Profile**: fetch/update user data, avatar upload (Cloudinary).
- **Expenses**: add for today or a past date, list by date or all dates, edit and delete.
- **Money**: add pocket money, add/track lent money and mark as received.
- **Reports**: monthly totals for expenses and added money (authenticated).
- **Admin**: list all users, send newsletter (protected routes; intended for admin clients).
- **Account lifecycle**: delete account (with related archival/deletion logic on the server).

## Project structure

```
moneytrack/
├── src/
│   ├── controllers/         # Route handlers
│   ├── db/                  # MongoDB connection
│   ├── middleware/          # Auth, uploads
│   ├── models/              # Mongoose models
│   ├── routes/              # Express routers
│   ├── services/            # Auth and shared logic
│   └── utils/               # Email, Cloudinary helpers, responses, etc.
├── public/                  # Static assets and HTML email templates
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

## Technology stack

**Runtime and API**

![Node.js](https://img.shields.io/badge/node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/mongodb-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)

**Security and auth**

![JWT](https://img.shields.io/badge/jwt-%23FF0000.svg?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Bcrypt](https://img.shields.io/badge/bcrypt-%23003554.svg?style=for-the-badge&logo=bcrypt&logoColor=white)
![Google OAuth](https://img.shields.io/badge/google_oauth-%234285F4.svg?style=for-the-badge&logo=google&logoColor=white)

**Integrations**

![Cloudinary](https://img.shields.io/badge/cloudinary-%233776E6.svg?style=for-the-badge&logo=cloudinary&logoColor=white)
![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)

## Run locally

### Prerequisites

- Node.js 16+
- npm or yarn
- MongoDB (local instance or Atlas URI)

### Setup

1. Clone the repository and enter the project directory:

    ```bash
    git clone <repository-url>
    cd moneytrack
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the project root (see [Environment variables](#environment-variables)).

4. Start the API:

    ```bash
    npm run dev
    ```

The app listens on the port set by `PORT` (for example `http://localhost:5000`). `GET /` returns a short JSON welcome payload.

## Run with Docker

1. Create `.env` from the defaults:

    ```bash
    cp .env.default .env
    ```

2. Build and start API + MongoDB:

    ```bash
    docker compose up --build -d
    ```

3. Follow logs:

    ```bash
    docker compose logs -f api
    ```

4. Stop services:

    ```bash
    docker compose down
    ```

Use `docker compose down -v` if you also want to remove the MongoDB volume.

## Scripts

| Command          | Description                                 |
| ---------------- | ------------------------------------------- |
| `npm run dev`    | Development server with `tsx watch`         |
| `npm run build`  | Compile TypeScript to `dist`                |
| `npm run start`  | Production start (`node dist/src/index.js`) |
| `npm run format` | Format with Prettier                        |

## API endpoints

Base URL: your server origin (e.g. `http://localhost:5000`). JSON bodies unless noted. Routes marked **JWT** require a valid access token (cookie/header as implemented by `auth.middleware.js`).

### Root

| Method | Endpoint | Description         |
| ------ | -------- | ------------------- |
| GET    | `/`      | API welcome message |

### User and expenses — `/api/user`

**Auth**

| Method | Endpoint                   | Auth | Description                  |
| ------ | -------------------------- | ---- | ---------------------------- |
| POST   | `/register`                | —    | Register                     |
| POST   | `/login`                   | —    | Login                        |
| POST   | `/google-login`            | —    | Google OAuth                 |
| GET    | `/logout`                  | JWT  | Logout                       |
| GET    | `/account-verification`    | —    | Verify account (query token) |
| GET    | `/is-user-verified`        | JWT  | Check verification status    |
| POST   | `/send-reset-link`         | —    | Request password reset email |
| GET    | `/reset-password/validate` | —    | Validate reset token         |
| PATCH  | `/reset-password`          | —    | Reset password               |

**Profile**

| Method | Endpoint               | Auth | Description                 |
| ------ | ---------------------- | ---- | --------------------------- |
| GET    | `/get-user-data`       | JWT  | Current user payload        |
| PATCH  | `/change-user-details` | JWT  | Update profile fields       |
| POST   | `/change-avatar`       | JWT  | Upload avatar (`multipart`) |

**Expenses**

| Method | Endpoint                   | Auth | Description               |
| ------ | -------------------------- | ---- | ------------------------- |
| POST   | `/add-today-expenses`      | JWT  | Add expense for today     |
| GET    | `/show-today-expenses`     | JWT  | Today’s expenses          |
| POST   | `/add-past-date-expenses`  | JWT  | Add expense for a date    |
| POST   | `/show-past-date-expenses` | JWT  | Expenses for a given date |
| PATCH  | `/edit-expenses`           | JWT  | Edit expense              |
| DELETE | `/delete-expenses`         | JWT  | Delete expense            |
| GET    | `/show-all-date-expenses`  | JWT  | All expenses              |

**Wallet and lent money**

| Method | Endpoint               | Auth | Description               |
| ------ | ---------------------- | ---- | ------------------------- |
| POST   | `/add-money`           | JWT  | Add pocket money          |
| POST   | `/add-lent-money`      | JWT  | Record lent money         |
| GET    | `/get-all-lent-money`  | JWT  | Lent money history        |
| POST   | `/received-lent-money` | JWT  | Mark lent amount received |

**Sessions**

| Method | Endpoint                      | Auth | Description          |
| ------ | ----------------------------- | ---- | -------------------- |
| GET    | `/get-all-sessions`           | JWT  | List active sessions |
| DELETE | `/delete-active-session`      | JWT  | Revoke one session   |
| DELETE | `/delete-all-active-sessions` | JWT  | Revoke all sessions  |

**Account**

| Method | Endpoint          | Auth | Description    |
| ------ | ----------------- | ---- | -------------- |
| DELETE | `/delete-account` | JWT  | Delete account |

**Admin-style (JWT; enforce admin role in your client or extend server checks)**

| Method | Endpoint           | Auth | Description     |
| ------ | ------------------ | ---- | --------------- |
| GET    | `/get-all-users`   | JWT  | List users      |
| POST   | `/send-newsletter` | JWT  | Send newsletter |

### Reports — `/api/user/report`

| Method | Endpoint                                   | Auth | Description                              |
| ------ | ------------------------------------------ | ---- | ---------------------------------------- |
| POST   | `/total-expenses-and-added-money-in-month` | JWT  | Monthly totals (body selects month/year) |

## Environment variables

Create `server/.env` with at least:

| Variable                                   | Description                           |
| ------------------------------------------ | ------------------------------------- |
| `PORT`                                     | HTTP port                             |
| `MONGO_URL`                                | MongoDB connection string             |
| `ACCESS_TOKEN_SECRET_KEY`                  | Secret for JWT access tokens          |
| `ACCESS_TOKEN_SECRET_EXPIRY`               | Access token TTL (e.g. `3d`)          |
| `RESET_PASSWORD_TOKEN_SECRET`              | Secret for password reset tokens      |
| `RESET_PASSWORD_TOKEN_SECRET_EXPIRY`       | Reset token TTL (e.g. `1d`)           |
| `ACCOUNT_VERIFICATION_TOKEN_SECRET`        | Secret for email verification tokens  |
| `ACCOUNT_VERIFICATION_TOKEN_SECRET_EXPIRY` | Verification token TTL                |
| `GOOGLE_CLIENT_ID`                         | Google OAuth client ID                |
| `ADMIN_GMAIL`                              | Sender / BCC address used by mailer   |
| `GMAIL_PASSKEY`                            | Gmail app password for SMTP           |
| `FRONTEND_URL`                             | Used in verification/reset flows      |
| `SERVER_URL`                               | Public API base URL (links in emails) |

**Cloudinary** (avatar uploads) is configured in `server/src/utils/constants.js` in this project. Adjust those values or refactor to read from env if you prefer secrets outside the repo.

CORS in `server/src/app.js` allows requests without `Origin` or from origins matching `*.lokeshwardewangan.in` or `*.vercel.app`. For local browser clients on other hosts you may need to extend that configuration.

## Contributing

1. Fork the repository and create a branch (`feature/…`, `fix/…`, or `chore/…`).
2. Change server code and run `npm run format` in `server/`.
3. Open a pull request with a clear description of the API or behavior change.

---

For questions or suggestions, open an issue on the repository.
