import { anthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Priority: GLM Coding Plan → Anthropic Claude → Groq. GLM uses Z.AI's
// OpenAI-compatible coding endpoint (not the general /api/paas/v4 API).

const GLM_CODING_BASE_URL = "https://api.z.ai/api/coding/paas/v4";
const GLM_DEFAULT_MODEL = "glm-4.5";

export type ResolvedModel = {
  model: LanguageModel;
  id: string;
};

export function resolveModel(): ResolvedModel | null {
  const glmApiKey = process.env.GLM_API_KEY || process.env.ZAI_API_KEY;
  if (glmApiKey) {
    const modelId = process.env.GLM_MODEL || GLM_DEFAULT_MODEL;
    const glm = createOpenAI({
      apiKey: glmApiKey,
      baseURL: process.env.GLM_BASE_URL || GLM_CODING_BASE_URL,
      name: "glm",
    });
    // Coding Plan base URL is chat-completions; provider() defaults to Responses.
    return { model: glm.chat(modelId), id: modelId };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return { model: anthropic("claude-opus-5"), id: "claude-opus-5" };
  }

  if (process.env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    return { model: groq("openai/gpt-oss-120b"), id: "openai/gpt-oss-120b" };
  }

  return null;
}
