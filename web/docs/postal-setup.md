# Self-hosted SMTP with Postal

Postal is an open-source mail server (MTA) — the layer that actually
delivers email to inboxes. MailKit uses it for production sends.

## TL;DR: this is the hard part

Code is the easy 20%. Deliverability is the 80%:

- A VPS with a **clean IP** (Hetzner / OVH IPs are often blacklisted; AWS
  Lightsail and DigitalOcean are mid; dedicated Postmark/SES is best).
- Working **rDNS / PTR record** for that IP (set via your VPS provider).
- DNS records on the sending domain: **SPF, DKIM, DMARC, MTA-STS**.
- **IP warm-up**: 50 emails day 1, 100 day 2, 200 day 3 — ramp over ~4 weeks.
- Monitor bounce + complaint rates; suppress immediately.

## Architecture

```
[ MailKit web ] ── BullMQ ──> [ Worker ] ── SMTP ──> [ Postal ] ──> internet
       ▲                                                │
       └────────── webhook (bounce/complaint) ──────────┘
```

## 1. Provision a server

Recommended: dedicated IPv4, 4 GB RAM, Ubuntu 22.04+. Open ports
**25, 465, 587** outbound and inbound 25.

Verify your provider does NOT block port 25 outbound (most cloud
providers do — check first). DigitalOcean blocks by default; Hetzner
allows after a support ticket; OVH and AWS Lightsail allow.

## 2. DNS records

For sending domain `mail.example.com`:

| Type | Host                       | Value                                                            |
| ---- | -------------------------- | ---------------------------------------------------------------- |
| A    | postal                     | YOUR.SERVER.IP                                                   |
| MX   | mail                       | 10 postal.example.com                                            |
| TXT  | mail                       | `v=spf1 a mx ip4:YOUR.SERVER.IP -all`                            |
| TXT  | postal-dkim._domainkey.mail| (DKIM public key — Postal generates this when you add a domain)  |
| TXT  | _dmarc                     | `v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; pct=100`  |
| TXT  | _mta-sts                   | `v=STSv1; id=20240101000000Z`                                    |

Also set a **PTR record** for `YOUR.SERVER.IP → postal.example.com`
via your VPS provider's reverse DNS panel.

## 3. Install Postal

Postal ships official Docker images. Quick start:

```bash
# On the server
git clone https://github.com/postalserver/install /opt/postal-install
cd /opt/postal-install
./bin/postal-install
```

Walk through the prompts. Postal will:

1. Generate a signing key
2. Set up MariaDB + RabbitMQ
3. Configure SMTP listener on :25

After install, open `https://postal.example.com/`, sign in, and:

1. Create an **organisation**.
2. Add a **mail server** (this is per-tenant; MailKit can have one per workspace).
3. Add a **sending domain** — Postal shows the DKIM/SPF records to add.
4. Verify the domain (Postal queries DNS until records appear).
5. Create a **credential** (SMTP user/pass). Paste these into MailKit's
   `.env`:

   ```
   SMTP_HOST=postal.example.com
   SMTP_PORT=25
   SMTP_USER=<credential username>
   SMTP_PASS=<credential password>
   SMTP_FROM="Your Brand <hello@mail.example.com>"
   ```

## 4. Wire up Postal webhooks

In Postal: **Server → Webhooks → Create webhook**.

- URL: `https://your-mailkit-app.com/api/webhooks/postal`
- Events: `MessageDelivered`, `MessageBounced`, `MessageSpamComplaint`
- Sign with a shared secret → set in MailKit `.env` as
  `POSTAL_WEBHOOK_SECRET=...`

MailKit verifies signatures in `src/app/api/webhooks/postal/route.ts`
and updates subscriber status / suppression list automatically.

## 5. IP warm-up schedule

| Day  | Max sends / day |
| ---- | --------------- |
| 1    | 50              |
| 2    | 100             |
| 3    | 500             |
| 4    | 1,000           |
| 7    | 5,000           |
| 14   | 20,000          |
| 30+  | unlimited       |

Always send to your **most engaged** subscribers first during warm-up.
Cold IP + cold list = guaranteed spam folder.

## 6. Monitoring

- Postal dashboard shows real-time delivery / bounce / spam-complaint rates.
- Keep **bounce rate < 2%**, **complaint rate < 0.1%**. Exceeding these
  burns your IP reputation fast.
- Use https://mail-tester.com to score sample sends — aim for 9+/10.
- Watch Gmail Postmaster Tools and Microsoft SNDS for inbox placement.

## Dev mode (no Postal)

For local development we use **Mailpit** (see `docker-compose.dev.yml`).
It captures all outbound mail at `http://localhost:8025` without
actually sending. `.env.local`:

```
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM="MailKit Dev <dev@localhost>"
```
