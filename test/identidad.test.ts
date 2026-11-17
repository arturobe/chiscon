import { describe, expect, it } from "vitest";
import { evaluarAccion, nivelBase } from "../src/identidad/niveles";
import { emitirCodigo, verificarCodigo } from "../src/identidad/codigos";

const SECRETO = "secreto-de-prueba";
const desconocido = { enPadron: false, optInVigente: false, esPresidenteDesignado: false };
const vecino = { enPadron: true, optInVigente: true, esPresidenteDesignado: false };
const presidente = { enPadron: true, optInVigente: true, esPresidenteDesignado: true };

describe("US-002 niveles de identidad", () => {
  it("un número desconocido es N0 y puede reportar, pero no ver el edificio ni la seguridad", () => {
    expect(nivelBase(desconocido)).toBe("N0");
    expect(evaluarAccion(desconocido, "REPORTAR_COMUN")).toEqual({ permitido: true, requiereCodigo: false });
    expect(evaluarAccion(desconocido, "VER_ESTADO_EDIFICIO").permitido).toBe(false);
    expect(evaluarAccion(desconocido, "VER_CATEGORIA_SEGURIDAD").permitido).toBe(false);
  });

  it("en padrón sin opt-in sigue siendo N0", () => {
    expect(nivelBase({ ...vecino, optInVigente: false })).toBe("N0");
  });

  it("un vecino N1 firma solo con código", () => {
    expect(evaluarAccion(vecino, "FIRMAR_PRESUPUESTO")).toEqual({ permitido: true, requiereCodigo: true });
  });

  it("solo el presidente designado aprueba, y con código", () => {
    expect(evaluarAccion(vecino, "APROBAR_PRESIDENTE").permitido).toBe(false);
    expect(evaluarAccion(presidente, "APROBAR_PRESIDENTE")).toEqual({ permitido: true, requiereCodigo: true });
  });
});

describe("US-002 códigos de un solo uso ligados al documento", () => {
  const doc = "Presupuesto v1: desatasco bajante, 120 € + IVA";
  const t0 = new Date("2027-02-15T10:00:00Z");

  it("no guarda el código en claro", () => {
    const e = emitirCodigo(SECRETO, "pres1", doc, t0);
    expect(JSON.stringify(e.registro)).not.toContain(e.codigo);
    expect(JSON.stringify(e.registro)).not.toContain(e.enlaceToken);
  });

  it("acepta el código correcto una sola vez", () => {
    const e = emitirCodigo(SECRETO, "pres1", doc, t0);
    const r1 = verificarCodigo(SECRETO, e.registro, e.enlaceToken, e.codigo, doc, t0);
    expect(r1.ok).toBe(true);
    const r2 = verificarCodigo(SECRETO, r1.registro, e.enlaceToken, e.codigo, doc, t0);
    expect(r2).toMatchObject({ ok: false, motivo: "YA_USADO" });
  });

  it("invalida la firma si el presupuesto cambió", () => {
    const e = emitirCodigo(SECRETO, "pres1", doc, t0);
    const r = verificarCodigo(SECRETO, e.registro, e.enlaceToken, e.codigo, doc + " (modificado)", t0);
    expect(r).toMatchObject({ ok: false, motivo: "DOCUMENTO_CAMBIADO" });
  });

  it("caduca el código a los 10 minutos", () => {
    const e = emitirCodigo(SECRETO, "pres1", doc, t0);
    const tarde = new Date(t0.getTime() + 11 * 60_000);
    expect(verificarCodigo(SECRETO, e.registro, e.enlaceToken, e.codigo, doc, tarde)).toMatchObject({
      ok: false,
      motivo: "CODIGO_CADUCADO",
    });
  });

  it("bloquea al tercer intento fallido", () => {
    const e = emitirCodigo(SECRETO, "pres1", doc, t0);
    const malo = e.codigo === "000000" ? "111111" : "000000";
    let reg = e.registro;
    const motivos: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = verificarCodigo(SECRETO, reg, e.enlaceToken, malo, doc, t0);
      reg = r.registro;
      if (!r.ok) motivos.push(r.motivo);
    }
    expect(motivos).toEqual(["CODIGO_INCORRECTO", "CODIGO_INCORRECTO", "DEMASIADOS_INTENTOS", "DEMASIADOS_INTENTOS"]);
    expect(verificarCodigo(SECRETO, reg, e.enlaceToken, e.codigo, doc, t0)).toMatchObject({ ok: false });
  });

  it("rechaza un enlace que no corresponde", () => {
    const e = emitirCodigo(SECRETO, "pres1", doc, t0);
    expect(verificarCodigo(SECRETO, e.registro, "otro-token", e.codigo, doc, t0)).toMatchObject({
      ok: false,
      motivo: "ENLACE_INVALIDO",
    });
  });
});
