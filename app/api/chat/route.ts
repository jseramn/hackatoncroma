import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type ToolSet,
  type UIMessage,
} from "ai";
import { CROMA_MCP_URL, createCromaToolbox } from "@/lib/croma-tools";
import { resolveModel } from "@/lib/model";
import { clientIp, ratelimit } from "@/lib/ratelimit";
import { createVerifyToolbox } from "@/lib/verify-mcp";

// Demo chat: Mallanet Verify MCP (Neon schema `verify`) + Croma MCP.

export const maxDuration = 120;

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_PINNED_TOOLS = 16;

function instructions() {
  const today = new Date().toISOString().slice(0, 10);
  return `Eres el demo de Mallanet Verify. Hoy es ${today}.

Esta app muestra cómo funciona el MCP de Mallanet Verify integrado con Neon (schema \`verify\`) y el MCP de Croma (${CROMA_MCP_URL}).

Capa Mallanet Verify (prioridad para verificación de voluntarios):
- list_pending_volunteers — voluntarios en Neon/memory sin reporte
- get_volunteer — un registro por volunteer_id
- request_verification_data — vincula document_number (y LinkedIn opcional). Nunca repitas ni registres la cédula en logs o en texto innecesario.
- verify_volunteer — orquesta Croma + persistencia y devuelve Pass/Alert/Fail
- generate_report, check_croma_background, validate_linkedin — tools del mismo MCP, usables por separado

Flujo de demo:
1. list_pending_volunteers o get_volunteer con volunteer_id "verify-operator-001"
2. Si el usuario pide la CC de muestra, request_verification_data con volunteer_id "verify-operator-001", document_type "CC" y document_number "1127938850"
3. verify_volunteer con volunteer_id "verify-operator-001"
4. Resume el reporte (overall_status + checks). No inventes hallazgos.

Croma MCP (consultas crudas, no el orquestador):
- Colombia: Rama Judicial, Policía, Procuraduría, RUES, SECOP, Registraduría, SIATA, etc.
- Perú: SUNAT, RREE, SAT Lima, SUTRAN
- México: DOF, SCJN, SIEM
Úsalo cuando pidan una fuente puntual, no un reporte Pass/Alert/Fail.

Reglas:
- Responde en el idioma del usuario; por defecto, español.
- Sé breve y directo. Markdown ligero.
- Nunca inventes datos. Si una herramienta falla o no hay datos, dilo. "found: false" es definitivo.
- Si Croma MCP devuelve status "pending" con job_id, reintenta hasta 3 veces.
- Si una herramienta falla, di solo que la consulta no está disponible; sin detalles internos.
- No des asesoría legal; los datos son informativos.
- No loguees ni cites la cédula más de lo necesario para confirmar la acción.`;
}

export async function POST(req: Request) {
  if (ratelimit) {
    const { success, limit, remaining, reset } = await ratelimit.limit(
      clientIp(req),
    );
    if (!success) {
      return Response.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        },
      );
    }
  }

  const resolved = resolveModel();
  if (!resolved) {
    return Response.json({ error: "no_model_configured" }, { status: 503 });
  }

  let messages: UIMessage[];
  let pinnedNames: string[] = [];
  try {
    const body = (await req.json()) as {
      messages?: UIMessage[];
      tools?: unknown;
    };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error("missing messages");
    }
    messages = body.messages.slice(-MAX_MESSAGES);
    const oversized = messages.some((m) =>
      m.parts?.some(
        (p) => p.type === "text" && p.text.length > MAX_MESSAGE_CHARS,
      ),
    );
    if (oversized) {
      return Response.json({ error: "message_too_long" }, { status: 413 });
    }
    if (Array.isArray(body.tools)) {
      pinnedNames = body.tools
        .filter((t): t is string => typeof t === "string" && t.length <= 128)
        .slice(0, MAX_PINNED_TOOLS);
    }
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  let croma: Awaited<ReturnType<typeof createCromaToolbox>> | undefined;
  let verify: Awaited<ReturnType<typeof createVerifyToolbox>> | undefined;
  try {
    croma = await createCromaToolbox();
  } catch (err) {
    console.error("[croma-chat] mcp connect failed", err);
  }
  try {
    verify = await createVerifyToolbox();
  } catch (err) {
    console.error("[verify] toolbox failed", err);
  }

  const merged: ToolSet = { ...croma?.tools, ...verify?.tools };
  const closeAll = () => {
    croma?.close();
    verify?.close();
  };

  const pinned = pinnedNames.filter((name) => Boolean(merged[name]));
  const tools =
    pinned.length > 0
      ? Object.fromEntries(pinned.map((name) => [name, merged[name]]))
      : Object.keys(merged).length > 0
        ? merged
        : undefined;
  const pinnedNote =
    pinned.length > 0
      ? `\n\nPara esta consulta el usuario fijó ${
          pinned.length === 1
            ? `la fuente "${pinned[0]}"`
            : `las fuentes ${pinned.map((n) => `"${n}"`).join(", ")}`
        }: responde usando solo esas herramientas. Si la pregunta no encaja con ellas, dilo y sugiere ajustar el filtro de fuentes.`
      : "";

  const result = streamText({
    model: resolved.model,
    instructions: instructions() + pinnedNote,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(12),
    onEnd: closeAll,
    onAbort: closeAll,
    onError: ({ error }) => {
      console.error("[croma-chat] stream error", error);
      closeAll();
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    onError: () => "agent_error",
  });
}
