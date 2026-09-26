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
| Pages | `app/ai/` (`/` chat, `/login` sign in + sign up, `/knowledge`, `/settings`, `/auth/confirm` email-link landing) |
| Ollama proxy | `app/api/chat/route.ts`, `app/api/models/route.ts`, `lib/ai/ollama.ts` |
| Keep Supabase awake | `app/api/cron/keepalive/route.ts`, `vercel.json` |
| Chat UI | `components/ai/` |
| Database | `supabase/migrations/0003_chat_schema.sql` |

## 1. Home computer: Ollama

- Install Ollama and pull at least one chat model (`ollama pull qwen3.6:35b-a3b-coding`)
  plus the embedding model used by the knowledge bases
  (`ollama pull qwen3-embedding:0.6b`, 1024 dims; the schema is fixed to that size).
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
2. SQL editor → paste and run `supabase/migrations/0003_chat_schema.sql`,
   then `0004_conversation_summary.sql` (compaction columns), then
   `0005_knowledge_schema.sql` (pgvector, knowledge-base tables, `match_chunks`),
   then `0006_knowledge_storage.sql` (private `knowledge` bucket + object policies
   for uploads; 50 MB per file, files live at `<user_id>/<document_id>/<name>`),
   then `0007_conversation_web_search.sql` (per-conversation web search flag),
   then `0008_user_settings.sql` (per-user settings such as the message color),
   then `0009_memories.sql` (per-user memory + the automatic-memory toggle),
   then `0010_knowledge_relevance.sql` (similarity in `match_chunks` for the relevance
   gate, and the Auto knowledge mode flag),
   then `0011_personalization.sql` (free-text reply preferences, Settings → Personalization),
   then `0012_signup_invite.sql` (invite-code gate for self-service sign-up; see below).
3. **Sign-up.** The login page has a "Create an account" form. To make it work:
   - **Authentication → Sign In / Providers**: turn on **Allow new users to sign up**
     and keep the **Email** provider enabled (leave **Confirm email** on so
     addresses are verified).
   - **Authentication → Email Templates → Confirm signup**: put the 6-digit code
     in the body so people can confirm from any device (the default template
     only has a link, which must be opened in the browser that started the
     sign-up). For example:

     ```html
     <h2>Confirm your account</h2>
     <p>Your code is <strong>{{ .Token }}</strong>. Enter it on the sign-up page.</p>
     <p>Or open this link on the same device: <a href="{{ .ConfirmationURL }}">confirm</a>.</p>
     ```

     The sign-up page verifies the code with `verifyOtp(type: 'signup')`; the
     link still works too (it lands on `/auth/confirm`). Codes expire after
     one hour (Authentication → Sign In / Providers → Email → OTP expiry).
   - **Authentication → URL Configuration**: Site URL `https://ai.pnwoods.com`,
     and add `https://ai.pnwoods.com/auth/confirm` to **Redirect URLs** (only
     needed for the link fallback).
   - Set the invite code (the migration inserts the placeholder `CHANGE-ME`):

     ```sql
     update public.app_config set value = 'your-code-here' where key = 'signup_invite_code';
     ```

     The trigger `on_auth_user_signup_invite` rejects any sign-up whose code
     does not match. Set the value to `''` to open sign-up, and clear it
     temporarily before creating a user from the dashboard (that insert runs
     the same trigger).
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
   | `OLLAMA_NUM_CTX` | context window requested per request (optional, default `32768`). Every request from this app (chat, compaction, memory extraction, image transcription) uses this one value on purpose: Ollama reloads the model (~20 s) whenever a request asks for a *different* `num_ctx`, larger or smaller. Any other client of the same Ollama (e.g. Roo Code / Cline in VS Code) should be set to the same number, or each switch between clients pays that reload. Measured on the RTX 4080 Laptop host with qwen3.6:35b-a3b-coding: 32K ≈ 73 tok/s, 64K ≈ 66 tok/s, 128K ≈ 65 tok/s. |
   | `OLLAMA_EMBED_MODEL` | embedding model for knowledge bases (optional, default `qwen3-embedding:0.6b`, must be 1024-dim) |
   | `OLLAMA_VISION_MODEL` | model that transcribes uploaded images (optional, default `qwen3.6:35b-a3b-coding`) |
   | `SEARXNG_URL` | enables the per-conversation "Web search" toggle via a self-hosted SearXNG, e.g. `https://search.pnwoods.com` (behind the same tunnel + Access token as Ollama; see "Web search" below) |
   | `BRAVE_SEARCH_API_KEY` | alternative search provider (prepaid, $5 free credit ≈ 1,000 queries/month); used only when `SEARXNG_URL` is unset or `SEARCH_PROVIDER=brave` |
   | `RAG_TOP_K` / `RAG_TOKEN_BUDGET` | excerpts per turn and their token budget (optional, defaults `8` / `2500`) |
   | `RAG_MIN_SIMILARITY` | relevance gate for knowledge excerpts (optional, default `0.52`; unrelated chat scores ≤ 0.45, on-topic ≥ 0.59 with qwen3-embedding) |
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

## Web search (SearXNG on the home network)

SearXNG is a free, self-hosted metasearch engine. It runs on any always-on
Linux box on the LAN (the Proxmox host is ideal) and is exposed through the
same Cloudflare tunnel and Access service token as Ollama, so Vercel reaches
it with the `CF_ACCESS_*` headers it already has.

Current deployment (2026-09-26): unprivileged LXC `205` (`searxng`, Debian 12,
Docker) on the Proxmox host `pve`, static IP `192.168.1.105`, config in
`/opt/searxng/config/settings.yml`, container `searxng` restarts on boot.
Tunnel route `search.pnwoods.com` → `http://192.168.1.105:8080`.

1. On the Linux host (Docker):

   ```bash
   mkdir -p ~/searxng && cd ~/searxng
   docker run -d --name searxng --restart unless-stopped -p 8080:8080 \
     -v "$PWD/config:/etc/searxng" -e BASE_URL=https://search.pnwoods.com/ \
     searxng/searxng
   ```

   Then edit `config/settings.yml` (created on first start):
   - under `search:` set `formats: [html, json]` (the JSON API is off by default)
   - under `server:` set `limiter: false` (bot detection blocks API clients)
   - under `server:` set a random `secret_key`

   `docker restart searxng`, then `curl 'http://localhost:8080/search?q=test&format=json' | head -c 300`
   should print JSON.
2. Cloudflare tunnel (Tunnels → ollama → Routes → Add route → Published
   application): subdomain `search`, domain `pnwoods.com`, service
   `http://<host-lan-ip>:8080`.
3. Cloudflare Access → Applications → edit the `ollama` application → add
   `search.pnwoods.com` as a second public hostname (same Service Auth policy),
   or create a second self-hosted app with the same policy. Verify:
   `curl -s -o /dev/null -w '%{http_code}' https://search.pnwoods.com/` → `403`.
4. Vercel: `SEARXNG_URL=https://search.pnwoods.com`, redeploy. Flip the Web
   search toggle in the chat header.

## VS Code (Cline) on another machine

See `docs/vscode-cline-c2m.md`: Cline through the tunnel with a dedicated
Access service token, plus the SQLcl MCP server bundled in the Oracle SQL
Developer extension for direct C2M queries.

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
