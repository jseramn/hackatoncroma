<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/croma_brand_white.svg">
  <img alt="Croma" src="public/croma_brand_black.svg" height="26">
</picture>

# Croma Chat Template

**A production-ready AI chat over live Latin American public data.**

Streaming chat built with the [Vercel AI SDK](https://ai-sdk.dev) and [AI Elements](https://ai-sdk.dev/elements), connected to the [Croma MCP server](https://platform.usecroma.com/mcp): judicial, tax, and registry sources from Colombia, Peru, and Mexico, queried in real time.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?project-name=croma-chat-template&repository-name=croma-chat-template&repository-url=https%3A%2F%2Fgithub.com%2Fcroma-ai%2Fcroma-chat-template&env=CROMA_API_KEY,GROQ_API_KEY&envDescription=CROMA_API_KEY+powers+the+live-data+tools+%28free+to+get%29.+GROQ_API_KEY+runs+the+model%2C+or+set+ANTHROPIC_API_KEY+after+deploy+to+use+Claude.&envLink=https%3A%2F%2Fplatform.usecroma.com%2Fsign-up)
&nbsp;
[![Get your Croma API key](public/croma-api-key-badge.svg)](https://platform.usecroma.com/sign-up)

</div>

---

## What's inside

- **Live MCP tools**: every request opens a client against `https://api.croma.run/mcp` and exposes the full Croma tool set to the model: Rama Judicial, SUNAT, RUES, SECOP, DOF, SCJN, SIATA, and 40+ more sources.
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
# fill in CROMA_API_KEY and GLM_API_KEY (or ANTHROPIC_API_KEY / GROQ_API_KEY)

bun dev              # or: pnpm dev / npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and try one of the suggestion chips: *"Consulta el RUC 20100047218 en SUNAT"* runs a real lookup against the Peruvian tax authority.

## Environment variables

| Variable                   | Required | Description                                                                                |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `CROMA_API_KEY`            | ✅       | Authenticates the MCP tools. [Get one free →](https://platform.usecroma.com/sign-up)       |
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
app/api/chat/route.ts        streamText + system prompt + UI message stream (+ optional pinned tools)
app/api/tools/route.ts       Tool catalog for the picker (MCP listTools, cached in-memory)
components/chat/chat.tsx     Chat orchestrator (useChat, composer, transcript)
components/chat/…            Header, empty state, message parts, tool picker
lib/croma-tools.ts           MCP client: discovery, auth, result truncation, error shielding
lib/model.ts                 Model resolution (GLM Coding Plan → Claude → Groq)
lib/ratelimit.ts             Optional Upstash rate limiter (active when env vars are set)
lib/sources.ts               Source taxonomy (country → category → source, mirrors the docs)
```

Each `POST /api/chat`:

1. Opens a fresh MCP client over streamable HTTP with `Authorization: Bearer $CROMA_API_KEY`.
2. Discovers the server's tools and hands them to `streamText` (`stopWhen: stepCountIs(8)` allows multi-step tool use, including re-polling Croma's async jobs).
3. Streams UI message chunks (text, reasoning, tool input/output) back to the client and closes the MCP client when the stream ends, aborts, or errors.

If the MCP server is unreachable, the chat degrades gracefully: the model still answers, just without live-data tools.

## Customization

- **Model**: edit `lib/model.ts`. Any [AI SDK provider](https://ai-sdk.dev/providers/ai-sdk-providers) works.
- **System prompt**: `instructions()` in `app/api/chat/route.ts`. Coverage list, tone, language, and the pending-job retry policy live here.
- **Suggestions & source taxonomy**: `SUGGESTIONS` and the country/category maps in `lib/sources.ts`.
- **Rate limits**: algorithm and window in `lib/ratelimit.ts`.
- **Look & feel**: design tokens in `app/globals.css` (`--line` hairlines, `--agent` accent, square radius; shadcn/Tailwind v4); components in `components/chat/` and `components/ai-elements/`.

## Production notes

- `maxDuration = 60` on the chat route covers multi-step tool chains on Vercel.
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
- Sample document (cédula): **1127938850**
- First suggestion chip runs a Colombia lookup on that CC.

