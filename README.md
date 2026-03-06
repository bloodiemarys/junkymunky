## JunkyMunky.com

Two-sided junk removal + reuse bidding marketplace with escrow.

### Stack
- **Next.js App Router** + TypeScript + Tailwind
- **Supabase** (Postgres, Auth, Storage, Realtime, RLS)
- **Stripe** (PaymentIntents w/ manual capture) + **Stripe Connect Express** (remover payouts)
- **Resend** (optional) for email notifications

### Core routes
- **Public**: `/`, `/how-it-works`, `/safety`, `/browse`, `/browse/[id]`
- **Auth**: `/sign-in`, `/sign-up`
- **Poster**: `/app/post`, `/app/jobs`, `/app/jobs/[id]`, `/app/checkout/[jobId]/[bidId]`
- **Remover**: `/app/remover/onboarding`, `/app/remover/jobs`, `/app/remover/bids`, `/app/remover/assignments`
- **Admin**: `/admin`, `/admin/jobs`, `/admin/users`, `/admin/payments`, `/admin/disputes`, `/admin/moderation`

### Env vars
Create `.env.local`:

```bash
APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional emails (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM="JunkyMunky <no-reply@yourdomain.com>"

# Optional (recommended in prod) for Vercel Cron auth
CRON_SECRET=some-long-random-string
```

### Supabase setup
- Create a Supabase project.
- In Supabase SQL editor, run migrations in `supabase/migrations/` in timestamp order.
- Create Storage bucket **`job-photos`** (migration attempts to create it; verify in Storage UI).
- Enable Realtime for `public.messages` (Database → Replication / Realtime).

### Supabase Auth notes
- The database trigger `handle_new_user()` auto-creates `profiles` rows on signup.
- `profiles.role` is protected by DB triggers (no self-escalation to admin; poster→remover allowed).

### Stripe setup
#### Webhook
Create a webhook endpoint pointing to:
- `POST /api/stripe/webhook`

Add events:
- `payment_intent.amount_capturable_updated`
- `payment_intent.succeeded`
- `payment_intent.canceled`
- `account.updated`
- `charge.refunded`

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

#### Connect
Removers start onboarding from:
- `/api/connect/start` (redirects to Stripe Express onboarding)

### Vercel cron
Create Vercel Cron jobs that call:
- `POST /api/cron/capture-eligible` (hourly)
- `POST /api/cron/remind-confirmation` (hourly or daily)
- `POST /api/cron/pay-held` (hourly) — retries payouts for captured jobs once Connect is enabled

Include header:
- `Authorization: Bearer $CRON_SECRET`

### Local dev
```bash
npm install
npm run dev
```

### Create your first admin
Option A (recommended): run the seed script (creates admin/poster/remover + sample job/bid):

```bash
npm run seed
```

Option B: call the service-role RPC manually using your service key (advanced):
- RPC: `admin_set_role(p_user_id, p_role)`
- Only callable with the **service role** key.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
