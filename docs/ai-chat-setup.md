# AI chat setup (ai.pnwoods.com)

A private, ChatGPT-style chat UI hidden on the site. The Next.js backend on
Vercel proxies to Ollama running on the home computer through a Cloudflare
Tunnel. Sign-in reuses the Supabase account from the workout tracker.

```
browser ──▶ ai.pnwoods.com (Vercel, Next.js)
               │  /api/chat, /api/models  (server-side, holds the Access token)
               ▼
        ollama.pnwoods.com (Cloudflare Tunnel + Access service token)
               ▼
        cloudflared on the home PC ──▶ http://localhost:11434 (Ollama)
```

Code map:

| Piece | Where |
| --- | --- |
| Host rewrite + auth gate | `middleware.ts` (`ai.pnwoods.com/*` → `/ai/*`) |
| Pages | `app/ai/` (`/` chat, `/login`) |
| Ollama proxy | `app/api/chat/route.ts`, `app/api/models/route.ts`, `lib/ai/ollama.ts` |
| Keep Supabase awake | `app/api/cron/keepalive/route.ts`, `vercel.json` |
| Chat UI | `components/ai/` |
| Database | `supabase/migrations/0003_chat_schema.sql` |

## 1. Home computer: Ollama

- Install Ollama and pull at least one model (`ollama pull llama3.1`).
- Leave the default bind (`127.0.0.1:11434`). `OLLAMA_HOST=0.0.0.0` is **not**
  needed because cloudflared runs on the same machine, and `OLLAMA_ORIGINS`
  is irrelevant (the Vercel backend calls Ollama server-to-server).
- Make sure Ollama starts at boot (the desktop app does this by default).

## 2. Home computer: Cloudflare Tunnel

Dashboard-managed tunnel (simplest):

1. Cloudflare Zero Trust → **Networks → Tunnels → Create a tunnel → Cloudflared**.
   Name it `ollama`.
2. Install the connector with the one-liner the dashboard shows
   (`cloudflared service install <TOKEN>`). On macOS run `brew install cloudflared`
   first; on Windows use an administrator shell. This registers it as a
   service that starts at boot.
3. **Public Hostname** tab → Add:
   - Subdomain `ollama`, domain `pnwoods.com`
   - Service: type `HTTP`, URL `localhost:11434`
   - **Additional application settings → HTTP Settings → HTTP Host Header:
     `localhost`**. Ollama rejects requests whose `Host` header is not a
     loopback name with `403`, so this setting is required.
4. Save. Cloudflare creates the proxied `ollama` CNAME automatically.

Config-file alternative (if you prefer a local `config.yml`):

```yaml
# ~/.cloudflared/config.yml
tunnel: <TUNNEL-UUID>
credentials-file: /home/<you>/.cloudflared/<TUNNEL-UUID>.json
ingress:
  - hostname: ollama.pnwoods.com
    service: http://localhost:11434
    originRequest:
      httpHostHeader: localhost
  - service: http_status:404
```

```bash
cloudflared tunnel login
cloudflared tunnel create ollama
cloudflared tunnel route dns ollama ollama.pnwoods.com
sudo cloudflared service install
```

## 3. Cloudflare Access: lock the tunnel

Ollama has no auth of its own, so the hostname must never be reachable without
a credential.

1. Zero Trust → **Access → Service Auth → Service Tokens → Create**. Name it
   `vercel-ollama`. Copy the **Client ID** and **Client Secret** now; the secret
   is shown once.
2. Zero Trust → **Access → Applications → Add an application → Self-hosted**.
   - Application domain: `ollama.pnwoods.com`
   - Add one policy: action **Service Auth**, include rule
     **Service Token** → `vercel-ollama`.
3. Save. Browsers now get a `403` at `https://ollama.pnwoods.com`; requests
   carrying `CF-Access-Client-Id` / `CF-Access-Client-Secret` pass through.

Test from any machine:

```bash
curl -s https://ollama.pnwoods.com/api/tags                       # -> 403 / login page
curl -s -H "CF-Access-Client-Id: $ID" -H "CF-Access-Client-Secret: $SECRET" \
     https://ollama.pnwoods.com/api/tags                          # -> {"models":[...]}
```

## 4. Supabase

1. Dashboard → project → **Restore project** (free projects pause after ~7 days
   without API traffic). Wait until it reports healthy.
2. SQL editor → paste and run `supabase/migrations/0003_chat_schema.sql`.
3. Confirm the manually created user still exists under **Authentication →
   Users** and that email signups remain disabled.
4. The daily cron in `vercel.json` hits `/api/cron/keepalive`, which runs one
   lightweight query so the project stays awake. It only runs on production
   deployments and only sends the bearer header when `CRON_SECRET` is set.

## 5. Vercel

1. **Settings → Domains → Add** `ai.pnwoods.com`.
2. In Cloudflare DNS add `CNAME  ai  →  cname.vercel-dns.com`, **DNS only
   (grey cloud)**. Proxying through Cloudflare adds a 100 s response timeout
   and buffering in front of Vercel's streaming, so leave it unproxied.
3. **Settings → Functions**: confirm **Fluid compute** is enabled. The chat
   route declares `maxDuration = 300`; without Fluid compute the Hobby limit
   is 60 s and the build fails. If you cannot enable it, change the value in
   `app/api/chat/route.ts` to `60`.
4. **Settings → Environment Variables** (Production, and Preview if wanted):

   | Name | Value |
   | --- | --- |
   | `OLLAMA_URL` | `https://ollama.pnwoods.com` |
   | `CF_ACCESS_CLIENT_ID` | from step 3 |
   | `CF_ACCESS_CLIENT_SECRET` | from step 3 |
   | `AI_HOST` | `ai.pnwoods.com` (optional, this is the default) |
   | `CRON_SECRET` | `openssl rand -hex 32` |
   | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | already set |

5. Redeploy.

## 6. Verify in production

- `https://ai.pnwoods.com` redirects to `/login`; sign in; the sidebar shows
  "Ollama online" and lists your models; a message streams back token by token.
- Stop mid-reply: the partial answer stays and is saved.
- Reload: the conversation is in the sidebar and reopens with its history.
- `https://pnwoods.com/ai` redirects to `https://ai.pnwoods.com/`.
- `https://pnwoods.com/workouts` and the public pages are unaffected.
- Response headers on `ai.pnwoods.com` include `x-robots-tag: noindex, nofollow`.
- Vercel → project → **Cron Jobs**: the keepalive job is listed; run it once by
  hand and check the log shows `{"ok":true,...}`.
- Turn the home PC off: the sidebar flips to "Ollama offline" with the tunnel
  message, and sending shows the same error instead of hanging.

## Local development

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OLLAMA_URL=http://localhost:11434
AI_HOST=ai.localhost:3000
CRON_SECRET=dev
```

Leave the `CF_ACCESS_*` variables empty so requests go straight to the local
Ollama. Run `ollama serve` and `npm run dev`, then:

- `http://localhost:3000/ai` → login → chat (main-domain paths, no redirect to
  the subdomain outside production).
- `http://ai.localhost:3000/` → login at `/login`, chat at `/` (browsers resolve
  `*.localhost` to loopback without a hosts-file entry).
- `curl -sI -H 'Host: ai.localhost:3000' http://localhost:3000/` → `307` to `/login`.
- `curl -s -H 'Authorization: Bearer dev' http://localhost:3000/api/cron/keepalive` → `{"ok":true}`.
- `OLLAMA_URL=http://localhost:1 npm run dev` → the UI reports Ollama unreachable.

## Notes

- Sessions are per host: signing in on `pnwoods.com/workouts` does not sign you
  in on `ai.pnwoods.com`, and vice versa.
- Nothing links to the chat app and no `robots.txt` rule mentions it (a
  disallow line would advertise the path).
- A cold model load on a large model can exceed the 100 s first-byte limit of
  the Cloudflare tunnel (a `524`). The chat request sets `keep_alive: 30m` so
  follow-up messages are fast; if the first message of a session fails, retry.
