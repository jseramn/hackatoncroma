import type { CatalogTool } from "@/lib/catalog";

export const VERIFY_CATALOG: CatalogTool[] = [
  {
    name: "list_pending_volunteers",
    title: "Voluntarios · pendientes",
    description: "Lista voluntarios pendientes de verificación.",
  },
  {
    name: "get_volunteer",
    title: "Voluntarios · ficha",
    description: "Lee un voluntario y su última verificación.",
  },
  {
    name: "request_verification_data",
    title: "Verify · datos",
    description: "Pide datos (cédula) para un voluntario pendiente.",
  },
  {
    name: "check_croma_background",
    title: "Croma · antecedentes",
    description: "Consulta fuentes oficiales (Policía, Procuraduría, Rama, RUES).",
  },
  {
    name: "validate_linkedin",
    title: "LinkedIn · URL",
    description: "Normaliza una URL de LinkedIn; no descarga el perfil.",
  },
  {
    name: "generate_report",
    title: "Verify · reporte",
    description: "Guarda el reporte Pass/Alert/Fail de un voluntario.",
  },
  {
    name: "verify_volunteer",
    title: "Verify · Pass/Alert/Fail",
    description: "Orquesta Croma y devuelve el reporte Pass, Alert o Fail.",
  },
];
