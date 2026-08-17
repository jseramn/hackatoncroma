<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/croma_brand_white.svg">
  <img alt="Croma" src="public/croma_brand_black.svg" height="26">
</picture>

# Croma Chat Template

**A production-ready AI chat over live Latin American public data.**

Streaming chat built with the [Vercel AI SDK](https://ai-sdk.dev) and [AI Elements](https://ai-sdk.dev/elements). This fork is the public demo of [Mallanet Verify](https://github.com/jseramn/mallanet-verify): the chat hosts that MCP (Neon schema `verify`) plus the [Croma MCP server](https://platform.usecroma.com/mcp).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?project-name=croma-chat-template&repository-name=croma-chat-template&repository-url=https%3A%2F%2Fgithub.com%2Fcroma-ai%2Fcroma-chat-template&env=CROMA_API_KEY,GROQ_API_KEY&envDescription=CROMA_API_KEY+powers+the+live-data+tools+%28free+to+get%29.+GROQ_API_KEY+runs+the+model%2C+or+set+ANTHROPIC_API_KEY+after+deploy+to+use+Claude.&envLink=https%3A%2F%2Fplatform.usecroma.com%2Fsign-up)
&nbsp;
[![Get your Croma API key](public/croma-api-key-badge.svg)](https://platform.usecroma.com/sign-up)

</div>

---

## What's inside

- **Two MCP layers**: Mallanet Verify (`list_pending_volunteers`, `verify_volunteer`, …) persists Pass/Alert/Fail reports in Neon schema `verify` (or an in-memory seed). Croma MCP stays available for raw live lookups (Rama Judicial, RUES, SUNAT, DOF, and 40+ more).
- **Streaming everything**: text, reasoning, and tool calls stream token-by-token via AI SDK v7's UI message stream.
- **World-class chat UI**: [AI Elements](https://ai-sdk.dev/elements) components on a swiss, ruled-sheet design system: hairline grid rails, mono eyebrow labels, square surfaces, inverted selection, conversation with stick-to-bottom scrolling, markdown responses (Streamdown), collapsible tool cards with friendly source labels, reasoning disclosure, stop/regenerate, dark mode.
- **Optional tool pinning**: a docs-style picker in the composer (country → category → source, searchable) pins one or more MCP tools. The selection applies per message: add, switch, or clear sources mid-conversation and the next question uses the new scope. The catalog is fetched live from the server and cached.
- **GLM-first model resolution**: uses Z.AI [GLM Coding Plan](https://docs.z.ai/devpack/quick-start) (`glm-4.5` via `https://api.z.ai/api/coding/paas/v4`) when `GLM_API_KEY` or `ZAI_API_KEY` is set, then Claude (`claude-opus-5`), then Groq (`openai/gpt-oss-120b`). Swap models in one file.
- **Optional rate limiting**: add two Upstash env vars and `/api/chat` is limited to 10 requests per minute per IP. Without them, the limiter is a no-op.
- **Honest data handling**: results are truncated before they blow up context, tool failures return a generic message (details stay in server logs), and Croma's async "pending job" lookups are automatically re-polled.

## One-click deploy

1. Click **Deploy with Vercel** above.
2. Grab a free API key with the **Get your Croma API key** button (sign-up takes a minute).
3. Paste your `CROMA_API_KEY` and a model key when Vercel asks for env vars: prefer `GLM_API_KEY` (Z.AI GLM Coding Plan), or `GROQ_API_KEY` (from [console.groq.com](https://console.groq.com/keys)).
4. Done. Your chat is live.

Prefer Claude? Add `ANTHROPIC_API_KEY` in your Vercel project settings (takes priority over Groq; GLM still wins if set).

## Running locally

```bash
git clone https://github.com/croma-ai/croma-chat-template
cd croma-chat-template
bun install          # or: pnpm install / npm install

cp .env.example .env.local
# fill in CROMA_API_KEY and a model key (GLM_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY)
# optional: DATABASE_URL for Neon persistencia (schema verify)

bun dev              # or: pnpm dev / npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and try the Mallanet chips: list pending volunteers, bind CC `1127938850`, then `verify_volunteer`.

## Environment variables

| Variable                   | Required | Description                                                                                |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `CROMA_API_KEY`            | ✅       | Authenticates Croma MCP and Verify's Croma REST calls. [Get one free →](https://platform.usecroma.com/sign-up) |
| `DATABASE_URL`             | optional | Neon/Postgres URL with DML on schema `verify` only. If omitted, Verify uses the in-memory seed `verify-operator-001`. |
| `GLM_API_KEY`              | ✅\*     | Z.AI [GLM Coding Plan](https://docs.z.ai/devpack/quick-start). Uses coding endpoint `https://api.z.ai/api/coding/paas/v4` (not general `/api/paas/v4`). Default model `glm-4.5`. |
| `ZAI_API_KEY`              | ✅\*     | Alias for `GLM_API_KEY`.                                                                   |
| `GLM_BASE_URL`             | optional | Override GLM OpenAI-compatible base URL (default: coding paas v4 above).                   |
| `GLM_MODEL`                | optional | Override GLM model id (default: `glm-4.5`).                                                |
| `GROQ_API_KEY`             | ✅\*     | Runs `openai/gpt-oss-120b` on [Groq](https://console.groq.com/keys).                       |
| `ANTHROPIC_API_KEY`        | ✅\*     | Runs `claude-opus-5`. Used when no GLM key is set; takes precedence over Groq.             |
| `CROMA_MCP_URL`            | optional | MCP endpoint override. Defaults to `https://api.croma.run/mcp`.                            |
| `UPSTASH_REDIS_REST_URL`   | optional | Enables rate limiting on `/api/chat`. [Upstash Console →](https://console.upstash.com/)    |
| `UPSTASH_REDIS_REST_TOKEN` | optional | Pairs with the URL above.                                                                  |

\* One model key is required: GLM Coding Plan, Anthropic, or Groq (priority in that order).

## How it works

```
app/api/chat/route.ts        streamText + Verify + Croma toolboxes (+ optional pinned tools)
app/api/tools/route.ts       Merged catalog (Verify + Croma listTools, cached)
components/chat/chat.tsx     Chat orchestrator (useChat, composer, transcript)
components/chat/…            Header, empty state, message parts, tool picker
lib/croma-tools.ts           Croma MCP HTTP client
lib/verify-mcp.ts            Verify stdio MCP (when DATABASE_URL is set) or in-process fallback
lib/verify-runtime.ts        Same Verify handlers as the MCP, memory/Neon store
lib/model.ts                 Model resolution (GLM Coding Plan → Claude → Groq)
lib/ratelimit.ts             Optional Upstash rate limiter (active when env vars are set)
lib/sources.ts               Source taxonomy (Mallanet + country → category → source)
```

Each `POST /api/chat`:

1. Opens Croma MCP over streamable HTTP (`Authorization: Bearer $CROMA_API_KEY`) when the key is set.
2. Opens Mallanet Verify: stdio MCP if `DATABASE_URL` + `CROMA_API_KEY` are set, otherwise the same seven handlers in-process (Neon when `DATABASE_URL` is set, memory seed otherwise).
3. Merges both tool sets into `streamText` (`stopWhen: stepCountIs(12)`).
4. Streams UI message chunks and closes both clients when the stream ends, aborts, or errors.

If one MCP is unreachable, the other still runs. Without a model key the route returns `no_model_configured`.

## Customization

- **Model**: edit `lib/model.ts`. Any [AI SDK provider](https://ai-sdk.dev/providers/ai-sdk-providers) works.
- **System prompt**: `instructions()` in `app/api/chat/route.ts`. Coverage list, tone, language, and the pending-job retry policy live here.
- **Suggestions & source taxonomy**: `SUGGESTIONS` and the country/category maps in `lib/sources.ts`.
- **Rate limits**: algorithm and window in `lib/ratelimit.ts`.
- **Look & feel**: design tokens in `app/globals.css` (`--line` hairlines, `--agent` accent, square radius; shadcn/Tailwind v4); components in `components/chat/` and `components/ai-elements/`.

## Production notes

- `maxDuration = 120` on the chat route covers Verify's Policía poll (~55s) plus Croma tool chains.
- Requests are capped at 24 messages / 4,000 chars per message before they reach the model.
- Rate limiting ships built in: set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` and `/api/chat` returns 429 (with `X-RateLimit-*` headers) past 10 requests per minute per IP, on a sliding window.
- For a public deployment, consider adding bot protection ([Vercel BotID](https://vercel.com/docs/botid)) on `/api/chat`.

## Learn more

- [Croma docs](https://docs.usecroma.com): every endpoint, with schemas
- [Croma MCP](https://platform.usecroma.com/mcp): connect the same server to Claude, ChatGPT, or Cursor
- [AI SDK docs](https://ai-sdk.dev/docs) · [AI Elements](https://ai-sdk.dev/elements)

## License

[MIT](LICENSE)


---

## Mallanet hackathon preview

Public fork used for the Croma hackathon demo.

- Live target: https://hackatoncroma.jseramn.tech
- Sample document (cédula): **1127938850** (bound at runtime onto `verify-operator-001`; not stored in the Verify seed)
- Suggestion chips: list pending → bind sample CC → `verify_volunteer` → raw Croma lookup
- Neon: set `DATABASE_URL` after applying `sql/001_verify_schema.sql` from [mallanet-verify](https://github.com/jseramn/mallanet-verify). Without it, the demo still runs in memory.

