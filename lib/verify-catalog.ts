import type { CatalogTool } from "@/lib/catalog";

export const VERIFY_CATALOG: CatalogTool[] = [
  {
    name: "list_pending_volunteers",
    title: "Mallanet · list_pending_volunteers",
    description:
      "Lista voluntarios del schema Neon verify que aún no tienen reporte",
  },
  {
    name: "get_volunteer",
    title: "Mallanet · get_volunteer",
    description: "Obtiene un voluntario de verify por id",
  },
  {
    name: "request_verification_data",
    title: "Mallanet · request_verification_data",
    description:
      "Vincula cédula y LinkedIn opcional a un voluntario (no loguea el número)",
  },
  {
    name: "check_croma_background",
    title: "Mallanet · check_croma_background",
    description:
      "Consulta Croma (Policía, Procuraduría, Rama, RUES) con degrade por fuente",
  },
  {
    name: "validate_linkedin",
    title: "Mallanet · validate_linkedin",
    description: "Normaliza una URL de LinkedIn; no descarga el perfil",
  },
  {
    name: "generate_report",
    title: "Mallanet · generate_report",
    description: "Persiste el reporte Pass/Alert/Fail de un voluntario",
  },
  {
    name: "verify_volunteer",
    title: "Mallanet · verify_volunteer",
    description:
      "Orquesta Croma + persistencia Neon/memory y devuelve el reporte",
  },
];
