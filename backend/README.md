# Backend

## Requirements

- Node.js 18+
- MySQL/MariaDB 8+ (XAMPP includes MariaDB)
- An API key for the configured AI provider

## Setup

1. Start MySQL in the XAMPP Control Panel.
2. Create the database `ai_code_review_assistant` in phpMyAdmin and import `schema.sql` if its tables are missing.
3. Copy `.env.example` to `.env` and set the MySQL values, `JWT_SECRET`, and a valid Gemini API key in `GEMINI_API_KEY` or `AI_API_KEY`. To enable password reset emails, also set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` for your email provider. Set `APP_URL` to the public base URL used in reset links. Never commit `.env` or share SMTP credentials. The example uses `gemini-3.5-flash-lite`.
4. Install dependencies and start the API:

```powershell
npm install
npm run dev
```

The application and API listen on `http://localhost:5500` by default. Express also serves the `frontend` folder, so open `http://localhost:5500/index.html` in the browser.

Password reset links expire after 30 minutes and can only be used once. The request page returns the same confirmation whether or not the email belongs to an account.

Saved reviews can be downloaded as professionally formatted PDF reports from the Review Details, Reports, and History views. The History page also retains the full-history Excel export.
