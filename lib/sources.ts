// Taxonomy for Croma MCP tools, mirroring the docs navigation
// (country → category → source). Tool names arrive as e.g.
// `rama_judicial_cases_by_radicado`; the first segment identifies the source.

export type Country = "Mallanet" | "Colombia" | "Perú" | "México" | "Global";

export const COUNTRIES: Country[] = [
  "Mallanet",
  "Colombia",
  "Perú",
  "México",
  "Global",
];

type SourceMeta = {
  label: string;
  country: Country;
  category: string;
};

const VERIFY_SOURCES: Record<string, SourceMeta> = {
  list_pending_volunteers: {
    label: "Neon verify",
    country: "Mallanet",
    category: "Voluntarios",
  },
  get_volunteer: {
    label: "Neon verify",
    country: "Mallanet",
    category: "Voluntarios",
  },
  request_verification_data: {
    label: "Neon verify",
    country: "Mallanet",
    category: "Voluntarios",
  },
  verify_volunteer: {
    label: "Verify",
    country: "Mallanet",
    category: "Orquestador",
  },
  generate_report: {
    label: "Verify",
    country: "Mallanet",
    category: "Orquestador",
  },
  check_croma_background: {
    label: "Croma (verify)",
    country: "Mallanet",
    category: "Fuentes",
  },
  validate_linkedin: {
    label: "LinkedIn",
    country: "Mallanet",
    category: "Fuentes",
  },
};

const SOURCES: Record<string, SourceMeta> = {
  // Colombia — Justicia y litigios
  rama: { label: "Rama Judicial", country: "Colombia", category: "Justicia y litigios" },
  samai: { label: "SAMAI", country: "Colombia", category: "Justicia y litigios" },
  consejo: { label: "Consejo de Estado", country: "Colombia", category: "Justicia y litigios" },
  cndj: { label: "CNDJ", country: "Colombia", category: "Justicia y litigios" },
  superfinanciera: { label: "Superfinanciera", country: "Colombia", category: "Justicia y litigios" },
  // Colombia — Verificación de personas
  registraduria: { label: "Registraduría", country: "Colombia", category: "Verificación de personas" },
  policia: { label: "Policía Nacional", country: "Colombia", category: "Verificación de personas" },
  procuraduria: { label: "Procuraduría", country: "Colombia", category: "Verificación de personas" },
  contraloria: { label: "Contraloría", country: "Colombia", category: "Verificación de personas" },
  contaduria: { label: "Contaduría", country: "Colombia", category: "Verificación de personas" },
  adres: { label: "ADRES", country: "Colombia", category: "Verificación de personas" },
  sicaac: { label: "SICAAC", country: "Colombia", category: "Verificación de personas" },
  // Colombia — Empresas e impuestos
  rues: { label: "RUES", country: "Colombia", category: "Empresas e impuestos" },
  supersociedades: { label: "Supersociedades", country: "Colombia", category: "Empresas e impuestos" },
  dian: { label: "DIAN", country: "Colombia", category: "Empresas e impuestos" },
  // Colombia — Contratación pública
  secop: { label: "SECOP", country: "Colombia", category: "Contratación pública" },
  ancp: { label: "ANCP-CCE", country: "Colombia", category: "Contratación pública" },
  // Colombia — Vehículos y tránsito
  runt: { label: "RUNT", country: "Colombia", category: "Vehículos y tránsito" },
  simit: { label: "SIMIT", country: "Colombia", category: "Vehículos y tránsito" },
  // Colombia — Otros
  legalize: { label: "Legalize", country: "Colombia", category: "Otros" },
  siata: { label: "SIATA", country: "Colombia", category: "Otros" },
  // Perú — Identidad e impuestos
  sunat: { label: "SUNAT", country: "Perú", category: "Identidad e impuestos" },
  rree: { label: "RREE", country: "Perú", category: "Identidad e impuestos" },
  sat: { label: "SAT Lima", country: "Perú", category: "Identidad e impuestos" },
  // Perú — Vehículos y tránsito
  callao: { label: "Callao", country: "Perú", category: "Vehículos y tránsito" },
  sutran: { label: "SUTRAN", country: "Perú", category: "Vehículos y tránsito" },
  apeseg: { label: "APESEG", country: "Perú", category: "Vehículos y tránsito" },
  sbs: { label: "SBS", country: "Perú", category: "Vehículos y tránsito" },
  // México — Leyes y regulación
  dof: { label: "DOF", country: "México", category: "Leyes y regulación" },
  diputados: { label: "Diputados", country: "México", category: "Leyes y regulación" },
  cnbv: { label: "CNBV", country: "México", category: "Leyes y regulación" },
  banxico: { label: "Banxico", country: "México", category: "Leyes y regulación" },
  // México — Justicia y fiscalías
  scjn: { label: "SCJN", country: "México", category: "Justicia y fiscalías" },
  fiscalia: { label: "Fiscalía", country: "México", category: "Justicia y fiscalías" },
  // México — Otros
  siem: { label: "SIEM", country: "México", category: "Otros" },
  // Global
  web: { label: "Búsqueda web", country: "Global", category: "Agentes" },
  extract: { label: "Extract", country: "Global", category: "Agentes" },
  generate: { label: "Generate", country: "Global", category: "Agentes" },
  research: { label: "Research", country: "Global", category: "Agentes" },
};

// Tools whose category differs from their source's default (docs place
// SAT Lima capturas under vehicles, account status under identity).
const TOOL_CATEGORY_OVERRIDES: Record<string, string> = {
  sat_lima_capturas: "Vehículos y tránsito",
};

export function sourceOf(toolName: string): SourceMeta | undefined {
  return VERIFY_SOURCES[toolName] ?? SOURCES[toolName.split("_")[0] ?? ""];
}

export function sourceLabel(toolName: string): string | undefined {
  return sourceOf(toolName)?.label;
}

export function toolTitle(toolName: string): string {
  const label = sourceLabel(toolName);
  return label ? `${label} · ${toolName}` : toolName;
}

export function countryOf(toolName: string): Country {
  return sourceOf(toolName)?.country ?? "Global";
}

export function categoryOf(toolName: string): string {
  return (
    TOOL_CATEGORY_OVERRIDES[toolName] ?? sourceOf(toolName)?.category ?? "Otros"
  );
}

export const SUGGESTIONS = [
  "Lista los voluntarios pendientes en Neon (schema verify)",
  "Vincula la CC de muestra 1127938850 al operador verify-operator-001",
  "Verifica verify-operator-001 y dame el reporte Pass/Alert/Fail",
  "Consulta la cédula 1127938850 en fuentes de Colombia",
];
