// Estados de alta de la comunidad (US-001): PENDIENTE_AUTORIZACION → LISTA_IMPORTAR → ACTIVA.
// Ningún bloqueo sin salida: cada motivo dice qué falta y quién lo resuelve.

export type EstadoAlta = "PENDIENTE_AUTORIZACION" | "LISTA_IMPORTAR" | "ACTIVA";

export interface ComunidadAlta {
  estadoAlta: EstadoAlta;
  dpaDespachoFirmado: boolean;
  autorizacionSubencargo: boolean;
  telefono24h: string | null; // póliza, mantenedora o proveedor con guardia
  mantenedoraAscensor: boolean | null; // null = la comunidad no tiene ascensor
  presidenteEmail: string | null;
  contactosImportados: number;
}

export interface Falta {
  codigo: string;
  queFalta: string;
  quienLoResuelve: "ADMINISTRADOR" | "PRESIDENTE";
}

export function faltasParaImportar(c: ComunidadAlta): Falta[] {
  const f: Falta[] = [];
  if (!c.dpaDespachoFirmado)
    f.push({ codigo: "DPA", queFalta: "Aceptar el contrato de encargo del despacho", quienLoResuelve: "ADMINISTRADOR" });
  if (!c.autorizacionSubencargo)
    f.push({
      codigo: "AUTORIZACION",
      queFalta: "Autorización de la comunidad para usar subencargados (declaración del despacho o firma del presidente)",
      quienLoResuelve: "PRESIDENTE",
    });
  return f;
}

export function faltasParaActivar(c: ComunidadAlta): Falta[] {
  const f = faltasParaImportar(c);
  if (!c.telefono24h)
    f.push({
      codigo: "TELEFONO_24H",
      queFalta: "Teléfono de urgencias 24 h (asistencia de la póliza, mantenedora o profesional de guardia)",
      quienLoResuelve: "ADMINISTRADOR",
    });
  if (c.mantenedoraAscensor === false)
    f.push({ codigo: "MANTENEDORA", queFalta: "Empresa mantenedora del ascensor", quienLoResuelve: "ADMINISTRADOR" });
  if (!c.presidenteEmail)
    f.push({
      codigo: "EMAIL_PRESIDENTE",
      queFalta: "Correo del presidente (para el aviso del art. 20 si no usa WhatsApp)",
      quienLoResuelve: "ADMINISTRADOR",
    });
  if (c.contactosImportados === 0)
    f.push({ codigo: "PADRON", queFalta: "Importar el padrón de vecinos", quienLoResuelve: "ADMINISTRADOR" });
  return f;
}

export function siguienteEstadoAlta(c: ComunidadAlta): EstadoAlta {
  if (faltasParaImportar(c).length > 0) return "PENDIENTE_AUTORIZACION";
  if (faltasParaActivar(c).length > 0) return "LISTA_IMPORTAR";
  return "ACTIVA";
}
