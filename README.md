# PulseChat

PulseChat is a Slack-style team chat application built with Next.js, Prisma, MySQL, Stream Chat/Video, Better Auth, and [Authy](https://github.com/wasmake/authy) SSO.

## Architecture

- Better Auth stores PulseChat sessions and maps Authy's stable OIDC `sub` claim to a local user.
- Authy is the only sign-in provider. The authorization-code flow uses S256 PKCE and OIDC discovery.
- Stream provides chat and video. Stream user records and tokens are created server-side from the authenticated Better Auth session.
- MySQL stores users, sessions, workspaces, memberships, channels, and invitations.
- Docker Compose starts PulseChat and MySQL and applies committed Prisma migrations before serving traffic.

Authy and Stream are external services. Authy can be deployed from its own repository; Stream is managed by GetStream.

## Configure Authy

PulseChat is one trusted downstream OIDC client. Configure these variables on the Authy deployment:

```env
BETTER_AUTH_URL=https://auth.example.com
OIDC_CLIENT_ID=pulsechat-production
OIDC_CLIENT_SECRET=replace-with-the-same-32-character-client-secret
OIDC_REDIRECT_URI=https://chat.example.com/api/auth/oauth2/callback/authy
OIDC_CLIENT_NAME=PulseChat
OIDC_CLIENT_DESCRIPTION=Team chat
OIDC_CLIENT_LAUNCH_URL=https://chat.example.com/sign-in
```

The redirect URI must exactly match PulseChat's Better Auth callback, including scheme, host, port, path, and trailing-slash behavior.

## Deploy PulseChat

Requirements: Docker with the Compose plugin, a running Authy deployment, and Stream Chat/Video credentials.

```sh
cp .env.example .env
# Set every password, secret, URL, and Stream credential in .env.
docker compose up --build -d
```

For local Compose, use these paired values:

```env
BETTER_AUTH_URL=http://localhost:3000
AUTHY_ISSUER=http://localhost:3001
AUTHY_CLIENT_ID=pulsechat
AUTHY_CLIENT_SECRET=replace-with-the-value-used-by-authy
```

`AUTHY_ISSUER` must equal Authy's public `BETTER_AUTH_URL`. Do not use an internal container hostname in production because OIDC issuer validation requires the public origin.

Open `BETTER_AUTH_URL` after both services are healthy. The sign-in button redirects to Authy and returns to `/api/auth/oauth2/callback/authy`.

Useful commands:

```sh
docker compose ps
docker compose logs -f app
docker compose exec -T db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" > pulsechat.sql
docker compose down
```

The `pulsechat-mysql` volume retains database data across restarts. Back it up before upgrades.

Workspace owners can open the workspace name in the sidebar to update its name, image, and accent color. The accent is applied to the workspace shell and follows users on any device.

## Local Development

Use Node.js 20 or newer and MySQL. Set the variables from `.env.example`, with a host-reachable `DATABASE_URL`, then run:

```sh
yarn install
yarn db:migrate
yarn dev
```

Quality checks:

```sh
yarn lint
yarn format:check
yarn typecheck
yarn playwright install chromium
yarn test:e2e
yarn build
```

## Required Environment

| Variable                     | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`               | Prisma MySQL connection; Compose constructs this automatically |
| `BETTER_AUTH_URL`            | Public PulseChat origin                                        |
| `BETTER_AUTH_SECRET`         | PulseChat session secret, at least 32 random characters        |
| `AUTHY_ISSUER`               | Public Authy origin                                            |
| `AUTHY_CLIENT_ID`            | Must match Authy's `OIDC_CLIENT_ID`                            |
| `AUTHY_CLIENT_SECRET`        | Must match Authy's `OIDC_CLIENT_SECRET`                        |
| `NEXT_PUBLIC_STREAM_API_KEY` | Public Stream application key, embedded during image build     |
| `STREAM_API_SECRET`          | Private Stream server secret                                   |

Compose additionally uses `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and optional `PULSECHAT_PORT`.

Generate secrets with `openssl rand -hex 32`. Use URL-safe values for the Compose-managed MySQL password because it is embedded in `DATABASE_URL`. Never commit `.env`; it is ignored by Git and the Docker build context.
