import { describe, expect, it } from "vitest";
import { importarPadron, normalizarTelefono, parsearCSV } from "../src/cartera/csv";
import { faltasParaActivar, siguienteEstadoAlta, type ComunidadAlta } from "../src/cartera/activacion";

describe("US-001 importación CSV con lista blanca", () => {
  const csv = [
    "Dirección;Piso;Puerta;Nombre;Móvil;DNI;IBAN;Deuda;Observaciones",
    "Calle Ríos Rosas 12;2;B;Carmen López;612 345 678;12345678Z;ES9121000418450200051332;0;tiene andador",
    'Calle Ríos Rosas 12;3;A;"Pérez; Luis";+34 699 111 222;;;;',
  ].join("\n");

  it("detecta ; como separador y respeta comillas", () => {
    const filas = parsearCSV(csv);
    expect(filas[2]?.[3]).toBe("Pérez; Luis");
  });

  it("descarta las columnas fuera de la lista blanca y lo explica", () => {
    const r = importarPadron(csv);
    expect(r.columnasDescartadas).toEqual(["DNI", "IBAN", "Deuda", "Observaciones"]);
    expect(r.columnasUsadas).toEqual(["direccion", "piso", "puerta", "nombre", "telefono"]);
    expect(r.mensaje).toContain("No subiremos DNI, IBAN, Deuda, Observaciones");
    const serializado = JSON.stringify(r.filas);
    expect(serializado).not.toContain("12345678Z");
    expect(serializado).not.toContain("ES91");
    expect(serializado).not.toContain("andador");
  });

  it("normaliza teléfonos a E.164", () => {
    const r = importarPadron(csv);
    expect(r.filas.map((f) => f.telefonoE164)).toEqual(["+34612345678", "+34699111222"]);
    expect(normalizarTelefono("0034 612 345 678")).toBe("+34612345678");
    expect(normalizarTelefono("123")).toBeNull();
  });

  it("no importa en silencio una fila con un DNI escondido en una columna permitida", () => {
    const r = importarPadron("Nombre;Teléfono\nAna 50000000T;611222333\nBea;622333444");
    expect(r.filas).toHaveLength(1);
    expect(r.enRevision).toEqual([{ numeroFila: 1, motivo: "POSIBLE_DATO_SENSIBLE" }]);
  });

  it("marca para revisión los teléfonos inválidos", () => {
    const r = importarPadron("Nombre;Teléfono\nAna;12");
    expect(r.enRevision).toEqual([{ numeroFila: 1, motivo: "TELEFONO_INVALIDO" }]);
  });
});

describe("US-001 activación de la comunidad", () => {
  const completa: ComunidadAlta = {
    estadoAlta: "LISTA_IMPORTAR",
    dpaDespachoFirmado: true,
    autorizacionSubencargo: true,
    telefono24h: "+34900000000",
    mantenedoraAscensor: true,
    presidenteEmail: "presi@example.com",
    contactosImportados: 12,
  };

  it("sin DPA o sin autorización queda pendiente de autorización", () => {
    expect(siguienteEstadoAlta({ ...completa, dpaDespachoFirmado: false })).toBe("PENDIENTE_AUTORIZACION");
    expect(siguienteEstadoAlta({ ...completa, autorizacionSubencargo: false })).toBe("PENDIENTE_AUTORIZACION");
  });

  it("no se activa sin teléfono 24 h, y dice qué falta y quién lo resuelve", () => {
    const sinTel = { ...completa, telefono24h: null };
    expect(siguienteEstadoAlta(sinTel)).toBe("LISTA_IMPORTAR");
    expect(faltasParaActivar(sinTel)).toEqual([
      expect.objectContaining({ codigo: "TELEFONO_24H", quienLoResuelve: "ADMINISTRADOR" }),
    ]);
  });

  it("sin ascensor no exige mantenedora", () => {
    expect(siguienteEstadoAlta({ ...completa, mantenedoraAscensor: null })).toBe("ACTIVA");
  });

  it("con todo cargado se activa", () => {
    expect(siguienteEstadoAlta(completa)).toBe("ACTIVA");
  });
});
