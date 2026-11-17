// Máquina de estados de la incidencia (US-003, US-007).
// Regla: solo transicionar() cambia el estado; la capa de datos escribe estado + evento en una transacción.

export type Estado =
  | "RECIBIDA"
  | "CLASIFICADA"
  | "ASIGNADA"
  | "ACEPTADA"
  | "PENDIENTE_APROBACION"
  | "EN_CAMINO"
  | "EN_CURSO"
  | "PENDIENTE_PIEZA"
  | "RESUELTA"
  | "CERRADA"
  | "ANULADA";

export type Urgencia = "U1" | "U2" | "U3" | "U4";
export type Ambito = "COMUN" | "PRIVATIVA" | "INDETERMINADA";
export type ActorTipo =
  | "SISTEMA"
  | "ASISTENTE"
  | "VECINO"
  | "PRESIDENTE"
  | "ADMINISTRADOR"
  | "PROFESIONAL"
  | "FUNDADOR";

const TRANSICIONES: Record<Estado, readonly Estado[]> = {
  RECIBIDA: ["CLASIFICADA", "ANULADA"],
  CLASIFICADA: ["ASIGNADA", "ANULADA"],
  ASIGNADA: ["ACEPTADA", "CLASIFICADA", "ANULADA"], // rechazo o plazo vencido → vuelve a asignarse
  ACEPTADA: ["PENDIENTE_APROBACION", "EN_CAMINO", "CLASIFICADA", "ANULADA"],
  PENDIENTE_APROBACION: ["EN_CAMINO", "CLASIFICADA", "ANULADA"],
  EN_CAMINO: ["EN_CURSO", "CLASIFICADA"],
  EN_CURSO: ["PENDIENTE_PIEZA", "RESUELTA"],
  PENDIENTE_PIEZA: ["EN_CURSO"],
  RESUELTA: ["CERRADA", "EN_CURSO"], // el vecino indica que sigue fallando
  CERRADA: [],
  ANULADA: [],
};

export interface Presupuesto {
  firmado: boolean; // firma N2 con código ligada al hash del PDF
  importeCents: number;
}

export interface Aprobaciones {
  administrador: boolean;
  presidente: boolean;
}

export interface IncidenciaSnapshot {
  id: string;
  estado: Estado;
  ambito: Ambito;
  urgenciaFinal: Urgencia;
  umbralAprobacionCents: number | null;
}

export interface ContextoTransicion {
  actor: ActorTipo;
  actorId?: string;
  fuente?: string;
  presupuesto?: Presupuesto;
  aprobaciones?: Aprobaciones;
  ahora?: Date;
}

export type ErrorTransicion =
  | "TRANSICION_NO_PERMITIDA"
  | "SIN_PRESUPUESTO_FIRMADO"
  | "FALTA_APROBACION_ADMINISTRADOR"
  | "FALTA_APROBACION_PRESIDENTE"
  | "ESTADO_FINAL";

export interface EventoTransicion {
  incidenciaId: string;
  tipo: "TRANSICION";
  desde: Estado;
  hasta: Estado;
  actorTipo: ActorTipo;
  actorId?: string;
  fuente?: string;
  creadoEn: Date;
}

export type ResultadoTransicion =
  | { ok: true; estado: Estado; evento: EventoTransicion; confirmacionHumana: boolean }
  | { ok: false; error: ErrorTransicion };

const ACTORES_HUMANOS: readonly ActorTipo[] = [
  "VECINO",
  "PRESIDENTE",
  "ADMINISTRADOR",
  "PROFESIONAL",
  "FUNDADOR",
];

/** Qué aprobación exige una incidencia según ámbito, urgencia e importe. */
export function aprobacionRequerida(
  inc: IncidenciaSnapshot,
  presupuesto: Presupuesto | undefined,
): { administrador: boolean; presidente: boolean } {
  if (inc.ambito !== "COMUN") {
    // Privativa: la conformidad es la firma del propio vecino en el presupuesto.
    return { administrador: false, presidente: false };
  }
  const importe = presupuesto?.importeCents ?? 0;
  const urgente = inc.urgenciaFinal === "U1" || inc.urgenciaFinal === "U2";
  // LPH art. 20: urgencias las ordena el administrador con aviso inmediato al presidente.
  if (urgente) return { administrador: true, presidente: false };
  const superaUmbral = inc.umbralAprobacionCents !== null && importe > inc.umbralAprobacionCents;
  return { administrador: true, presidente: superaUmbral };
}

function faltaAprobacion(
  inc: IncidenciaSnapshot,
  ctx: ContextoTransicion,
): ErrorTransicion | null {
  const req = aprobacionRequerida(inc, ctx.presupuesto);
  const ap = ctx.aprobaciones ?? { administrador: false, presidente: false };
  if (req.administrador && !ap.administrador) return "FALTA_APROBACION_ADMINISTRADOR";
  if (req.presidente && !ap.presidente) return "FALTA_APROBACION_PRESIDENTE";
  return null;
}

export function transicionar(
  inc: IncidenciaSnapshot,
  hasta: Estado,
  ctx: ContextoTransicion,
): ResultadoTransicion {
  const permitidas = TRANSICIONES[inc.estado];
  if (permitidas.length === 0) return { ok: false, error: "ESTADO_FINAL" };
  if (!permitidas.includes(hasta)) return { ok: false, error: "TRANSICION_NO_PERMITIDA" };

  // Puerta Decreto 35/1995: nada empieza sin presupuesto firmado.
  if (hasta === "EN_CURSO" && inc.estado === "EN_CAMINO") {
    if (!ctx.presupuesto?.firmado) return { ok: false, error: "SIN_PRESUPUESTO_FIRMADO" };
    const falta = faltaAprobacion(inc, ctx);
    if (falta) return { ok: false, error: falta };
  }

  // Salir de Aceptada hacia En camino solo si no hace falta aprobación o ya está dada.
  if (hasta === "EN_CAMINO") {
    if (!ctx.presupuesto?.firmado) return { ok: false, error: "SIN_PRESUPUESTO_FIRMADO" };
    const falta = faltaAprobacion(inc, ctx);
    if (falta) return { ok: false, error: falta };
  }

  const creadoEn = ctx.ahora ?? new Date();
  return {
    ok: true,
    estado: hasta,
    confirmacionHumana: ACTORES_HUMANOS.includes(ctx.actor),
    evento: {
      incidenciaId: inc.id,
      tipo: "TRANSICION",
      desde: inc.estado,
      hasta,
      actorTipo: ctx.actor,
      actorId: ctx.actorId,
      fuente: ctx.fuente,
      creadoEn,
    },
  };
}

const ORDEN_URGENCIA: Record<Urgencia, number> = { U1: 1, U2: 2, U3: 3, U4: 4 };

/** Urgencia final = la más alta entre reglas y modelo. */
export function urgenciaFinal(reglas: Urgencia | null, llm: Urgencia | null): Urgencia {
  const candidatas = [reglas, llm].filter((u): u is Urgencia => u !== null);
  if (candidatas.length === 0) return "U3";
  return candidatas.reduce((a, b) => (ORDEN_URGENCIA[a] <= ORDEN_URGENCIA[b] ? a : b));
}

/** Solo administrador o profesional en el sitio pueden bajar la urgencia. U1 no baja nunca. */
export function puedeCambiarUrgencia(actual: Urgencia, nueva: Urgencia, actor: ActorTipo): boolean {
  if (ORDEN_URGENCIA[nueva] <= ORDEN_URGENCIA[actual]) return true; // subir siempre se permite
  if (actual === "U1") return false;
  return actor === "ADMINISTRADOR" || actor === "PROFESIONAL";
}
