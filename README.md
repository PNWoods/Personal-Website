# pnwoods.com

Personal site of Patrick Woods (AI & Data Engineer), plus two private tools
that live in the same Next.js project: an invite-only AI chat workspace at
`ai.pnwoods.com` backed by models running on home hardware, and a small
workout tracker.

- **Public site**: Home, About (with publications), Skills, Projects, Contact.
- **AI workspace**: ChatGPT-style chat over Ollama with streaming, per-user
  memory and personalization, knowledge bases with hybrid vector + full-text
  retrieval and citations, live web search via a self-hosted SearXNG, context
  compaction for long conversations, and invite-code sign-up.
- **Workout tracker**: logging app behind the same Supabase auth.

## Stack

| Layer | What |
| --- | --- |
| Framework | Next.js 14 (App Router), TypeScript, Tailwind CSS, lucide-react |
| Hosting | Vercel (Fluid compute for long streaming responses), Vercel Web Analytics |
| Auth + data | Supabase: Postgres with pgvector, Row Level Security, Storage, email/password auth |
| Models | Ollama on a home machine, reached through a Cloudflare Tunnel locked with Zero Trust service tokens |
| Search | SearXNG in an LXC container on a Proxmox host, behind the same tunnel |

## Layout

```
app/
  (site)/            public pages: /, /about, /skills, /projects, /contact
  ai/                chat workspace (served at ai.pnwoods.com via middleware rewrite)
  api/               chat streaming, model list, knowledge ingestion, cron keepalive
  workouts/          workout tracker
  opengraph-image.tsx, icon.svg, robots.ts, sitemap.ts, not-found.tsx
components/
  sections/          public page content (Home, About, Skills, Projects)
  ai/                chat UI, knowledge base UI, settings
  workouts/
data/skills.ts       skill groups; a skill's group decides its tag colour everywhere
lib/site.ts          site constants: contact links, nav, publications
lib/ai/              prompt building, compaction, memory, retrieval, ingestion, extraction
supabase/migrations/ schema, run by hand in the Supabase SQL editor (see docs/)
docs/                setup guides for the AI workspace and the VS Code agent
middleware.ts        host rewrite for ai.pnwoods.com, auth gates for /ai and /workouts
```

## Running locally

```bash
npm install
cp .env.example .env.local   # Supabase URL + anon key; Ollama URL for the chat
npm run dev
```

The public pages need no environment variables. The AI workspace and workout
tracker need Supabase, and the chat needs a reachable Ollama; see
[`docs/ai-chat-setup.md`](docs/ai-chat-setup.md) for the full setup
(migrations, tunnel, Access tokens, environment variables) and
[`docs/vscode-cline-c2m.md`](docs/vscode-cline-c2m.md) for using the same
models from VS Code.

## Contact

- Website: [pnwoods.com](https://pnwoods.com)
- LinkedIn: [linkedin.com/in/pnwoods](https://www.linkedin.com/in/pnwoods/)
- Email: woods.patrick@icloud.com
