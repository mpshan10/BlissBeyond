# Bliss & Beyond Backend

## Local startup

The default Spring profile is `local` when no profile is explicitly selected.
Local startup uses `application-local.yml`, keeps Hibernate in validation mode,
and binds to port `8081`.

Create the ignored file
`config/application-local-secret.yml` with your local values, or
provide the same names through environment variables:

```yaml
DB_PASSWORD: your-local-mysql-password
# Optional: omit this to generate a new local-only JWT secret on each start.
# JWT_SECRET: a-local-secret-at-least-32-characters-long
```

The required local configuration names are `DB_URL`, `DB_USERNAME`,
`DB_PASSWORD`, and `JWT_SECRET` (the last one may be generated ephemerally by
the local profile). A JWT secret supplied manually must be at least 32
characters. Gmail/SMTP variables are optional locally; password-reset email
requests return a safe unavailable response when mail is not configured.

Start the backend with:

```text
mvn spring-boot:run
```

To select the profile explicitly:

```text
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Check local health at `http://localhost:8081/actuator/health`.

## Required configuration

Supply runtime configuration through environment variables. Do not commit local or production credentials.

Database:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`

Authentication:

- `JWT_SECRET` (strong, non-placeholder value of at least 32 characters)

Password-reset email:

- `MAIL_HOST`
- `MAIL_PORT` (normally `587` for Gmail SMTP)
- `MAIL_USERNAME` (`blissbeyond01@gmail.com` for the official sender)
- `MAIL_PASSWORD` (a Gmail App Password supplied through the environment, never the normal account password)
- `MAIL_FROM` (`blissbeyond01@gmail.com` for the official sender)
- `MAIL_SMTP_AUTH` (`true` for Gmail SMTP)
- `MAIL_SMTP_STARTTLS` (`true` for Gmail SMTP)

The `production` profile refuses to start when required database or password-reset mail configuration is missing. Local development may use a local SMTP test server, including one without authentication, by explicitly configuring the mail variables. OTP values are never printed or returned by the request endpoint.
