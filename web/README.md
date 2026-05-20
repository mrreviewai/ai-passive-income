# MailKit

Self-hosted email marketing platform — the open-source bones of a kit.com / ConvertKit clone.

## What's in here

- **Forms** — hosted + embeddable signup forms with double opt-in.
- **Subscribers** — list with tags, segments, suppression list, custom fields.
- **Broadcasts** — one-off emails to active subscribers with open/click tracking.
- **Sequences** — drip campaigns (steps + delay between each).
- **Worker** — BullMQ + Redis queue that actually sends through SMTP.
- **Tracking** — open pixel, click rewriting, one-click unsubscribe.
- **Postal webhook** — receives bounce / complaint events and auto-suppresses.

## Local dev

```bash
docker compose -f docker-compose.dev.yml up -d     # Postgres + Redis + Mailpit
cp .env.example .env.local
# Edit .env.local: DATABASE_URL, BETTER_AUTH_SECRET (openssl rand -hex 32)
npm install
npm run db:generate
npm run db:migrate
npm run dev                                         # http://localhost:3000
npm run worker                                      # in a separate terminal
```

Outbound mail in dev is captured by **Mailpit** at http://localhost:8025
(no real sending — see `docker-compose.dev.yml`).

## Production

See `docs/postal-setup.md` for the full self-hosted SMTP setup. The
hard part isn't the app — it's getting clean IP, DNS (SPF/DKIM/DMARC),
and IP warm-up right.

## What's NOT in the MVP yet

Tracked in roadmap:

- Visual automation builder (graph node editor)
- Landing pages builder
- A/B testing on subject lines
- Advanced segment query builder
- Public API + webhooks for external integrations
- Stripe Connect for commerce
- AI-assisted email writing
- React Email template gallery
- CSV import / export
- Team roles beyond `owner`

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Postgres + Drizzle ORM
- Redis + BullMQ for the send queue
- Better-Auth (email/password, self-hosted)
- Tailwind + shadcn/ui primitives
- nodemailer → Postal (MTA) in prod, Mailpit in dev
