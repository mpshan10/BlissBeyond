# Deployment Environment Names

Configure these variables in Render only. Do not place backend secrets in Vercel.

## Database

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

## Admin

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## SMTP

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `MAIL_SMTP_AUTH`
- `MAIL_SMTP_STARTTLS`

## Cloudinary

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## CORS

- `CORS_ALLOWED_ORIGINS`

Render supplies `PORT` automatically. The backend uses `8081` locally when `PORT` is absent.
