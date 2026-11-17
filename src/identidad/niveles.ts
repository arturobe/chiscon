// Identidad por niveles sin cuentas para vecinos y presidentes (US-002).

export type Nivel = "N0" | "N1" | "N2" | "N2P";

export type Accion =
  | "REPORTAR_COMUN"
  | "VER_PROPIO_REPORTE"
  | "VER_ESTADO_EDIFICIO"
  | "VER_CATEGORIA_SEGURIDAD"
  | "RECIBIR_AVISOS"
  | "FIRMAR_PRESUPUESTO"
  | "APROBAR_PRESIDENTE";

export interface Interlocutor {
  enPadron: boolean; // teléfono coincide con un Contacto de la comunidad
  optInVigente: boolean;
  esPresidenteDesignado: boolean; // designado por el despacho, nunca autodeclarado
}

/** Nivel base del interlocutor. N2 y N2P solo existen para una acción concreta con código verificado. */
export function nivelBase(i: Interlocutor): "N0" | "N1" {
  return i.enPadron && i.optInVigente ? "N1" : "N0";
}

const NIVEL_MINIMO: Record<Accion, Nivel> = {
  REPORTAR_COMUN: "N0",
  VER_PROPIO_REPORTE: "N0",
  VER_ESTADO_EDIFICIO: "N1",
  VER_CATEGORIA_SEGURIDAD: "N1",
  RECIBIR_AVISOS: "N1",
  FIRMAR_PRESUPUESTO: "N2",
  APROBAR_PRESIDENTE: "N2P",
};

const RANGO: Record<Nivel, number> = { N0: 0, N1: 1, N2: 2, N2P: 3 };

export function nivelMinimo(accion: Accion): Nivel {
  return NIVEL_MINIMO[accion];
}

/**
 * ¿Puede hacerlo ya, o necesita código? Las acciones N2/N2P siempre piden un código de 6 cifras
 * en el momento; aquí solo se comprueba que el interlocutor podría obtenerlo.
 */
export function evaluarAccion(
  i: Interlocutor,
  accion: Accion,
): { permitido: true; requiereCodigo: boolean } | { permitido: false; motivo: string } {
  const base = nivelBase(i);
  const minimo = NIVEL_MINIMO[accion];
  if (RANGO[minimo] <= RANGO[base]) return { permitido: true, requiereCodigo: false };
  if (minimo === "N2") {
    return base === "N1"
      ? { permitido: true, requiereCodigo: true }
      : { permitido: false, motivo: "El teléfono debe estar en el padrón con avisos aceptados" };
  }
  if (minimo === "N2P") {
    if (!i.esPresidenteDesignado) return { permitido: false, motivo: "Solo el presidente designado por el despacho" };
    return base === "N1"
      ? { permitido: true, requiereCodigo: true }
      : { permitido: false, motivo: "El presidente debe aceptar avisos antes de aprobar" };
  }
  return { permitido: false, motivo: "Nivel insuficiente" };
}
