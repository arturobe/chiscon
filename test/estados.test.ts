import { describe, expect, it } from "vitest";
import {
  aprobacionRequerida,
  puedeCambiarUrgencia,
  transicionar,
  urgenciaFinal,
  type IncidenciaSnapshot,
} from "../src/incidencias/estados";

const base = (over: Partial<IncidenciaSnapshot> = {}): IncidenciaSnapshot => ({
  id: "inc1",
  estado: "ACEPTADA",
  ambito: "COMUN",
  urgenciaFinal: "U3",
  umbralAprobacionCents: 30000,
  ...over,
});

describe("US-003 máquina de estados", () => {
  it("rechaza transiciones no permitidas", () => {
    const r = transicionar(base({ estado: "RECIBIDA" }), "EN_CURSO", { actor: "PROFESIONAL" });
    expect(r).toEqual({ ok: false, error: "TRANSICION_NO_PERMITIDA" });
  });

  it("no permite salir de un estado final", () => {
    expect(transicionar(base({ estado: "CERRADA" }), "EN_CURSO", { actor: "SISTEMA" })).toEqual({
      ok: false,
      error: "ESTADO_FINAL",
    });
  });

  it("genera el evento con desde/hasta y marca la confirmación humana", () => {
    const ahora = new Date("2027-02-15T10:00:00Z");
    const r = transicionar(base({ estado: "ASIGNADA" }), "ACEPTADA", { actor: "PROFESIONAL", actorId: "p1", ahora });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.evento).toMatchObject({ desde: "ASIGNADA", hasta: "ACEPTADA", actorTipo: "PROFESIONAL", creadoEn: ahora });
      expect(r.confirmacionHumana).toBe(true);
    }
  });

  it("una transición del sistema no cuenta como confirmación humana", () => {
    const r = transicionar(base({ estado: "RECIBIDA" }), "CLASIFICADA", { actor: "ASISTENTE" });
    expect(r.ok && r.confirmacionHumana).toBe(false);
  });
});

describe("US-007 puerta del presupuesto y aprobación por umbral", () => {
  it("no se pone en camino sin presupuesto firmado (Decreto 35/1995)", () => {
    const r = transicionar(base(), "EN_CAMINO", {
      actor: "PROFESIONAL",
      presupuesto: { firmado: false, importeCents: 10000 },
      aprobaciones: { administrador: true, presidente: false },
    });
    expect(r).toEqual({ ok: false, error: "SIN_PRESUPUESTO_FIRMADO" });
  });

  it("no entra en curso sin presupuesto firmado", () => {
    const r = transicionar(base({ estado: "EN_CAMINO" }), "EN_CURSO", {
      actor: "PROFESIONAL",
      presupuesto: { firmado: false, importeCents: 5000 },
      aprobaciones: { administrador: true, presidente: true },
    });
    expect(r).toEqual({ ok: false, error: "SIN_PRESUPUESTO_FIRMADO" });
  });

  it("zona común por encima del umbral exige al presidente", () => {
    const r = transicionar(base(), "EN_CAMINO", {
      actor: "ADMINISTRADOR",
      presupuesto: { firmado: true, importeCents: 45000 },
      aprobaciones: { administrador: true, presidente: false },
    });
    expect(r).toEqual({ ok: false, error: "FALTA_APROBACION_PRESIDENTE" });
  });

  it("zona común por debajo del umbral basta con el administrador", () => {
    const r = transicionar(base(), "EN_CAMINO", {
      actor: "ADMINISTRADOR",
      presupuesto: { firmado: true, importeCents: 20000 },
      aprobaciones: { administrador: true, presidente: false },
    });
    expect(r.ok).toBe(true);
  });

  it("urgencia en zona común: aprueba el administrador aunque supere el umbral (LPH art. 20)", () => {
    expect(aprobacionRequerida(base({ urgenciaFinal: "U2" }), { firmado: true, importeCents: 90000 })).toEqual({
      administrador: true,
      presidente: false,
    });
  });

  it("privativa: la conformidad es la firma del vecino, sin aprobación de la comunidad", () => {
    const r = transicionar(base({ ambito: "PRIVATIVA" }), "EN_CAMINO", {
      actor: "PROFESIONAL",
      presupuesto: { firmado: true, importeCents: 15000 },
    });
    expect(r.ok).toBe(true);
  });
});

describe("urgencia", () => {
  it("la final es la más alta entre reglas y modelo", () => {
    expect(urgenciaFinal("U1", "U3")).toBe("U1");
    expect(urgenciaFinal("U3", "U2")).toBe("U2");
    expect(urgenciaFinal(null, null)).toBe("U3");
  });

  it("solo administrador o profesional bajan la urgencia; U1 nunca baja", () => {
    expect(puedeCambiarUrgencia("U2", "U3", "VECINO")).toBe(false);
    expect(puedeCambiarUrgencia("U2", "U3", "ADMINISTRADOR")).toBe(true);
    expect(puedeCambiarUrgencia("U1", "U2", "ADMINISTRADOR")).toBe(false);
    expect(puedeCambiarUrgencia("U3", "U1", "ASISTENTE")).toBe(true);
  });
});
