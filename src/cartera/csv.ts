// Importación CSV con lista blanca (US-001). Se ejecuta en el navegador:
// las columnas no permitidas se descartan ANTES de subir nada y nunca se guardan ni se registran.

export const COLUMNAS_PERMITIDAS = [
  "direccion",
  "portal",
  "piso",
  "puerta",
  "nombre",
  "telefono",
  "email",
  "rol",
] as const;
export type ColumnaPermitida = (typeof COLUMNAS_PERMITIDAS)[number];

const ALIAS: Record<string, ColumnaPermitida> = {
  direccion: "direccion",
  domicilio: "direccion",
  comunidad: "direccion",
  portal: "portal",
  escalera: "portal",
  piso: "piso",
  planta: "piso",
  puerta: "puerta",
  letra: "puerta",
  nombre: "nombre",
  propietario: "nombre",
  titular: "nombre",
  telefono: "telefono",
  movil: "telefono",
  tlf: "telefono",
  tel: "telefono",
  email: "email",
  correo: "email",
  "correo electronico": "email",
  rol: "rol",
  cargo: "rol",
};

export function normalizarCabecera(c: string): string {
  return c
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Parser CSV mínimo (RFC 4180) con detección de separador ; o , (Excel en español usa ;). */
export function parsearCSV(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const primeraLinea = limpio.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primeraLinea.match(/;/g)?.length ?? 0) >= (primeraLinea.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (entreComillas) {
      if (ch === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else entreComillas = false;
      } else campo += ch;
    } else if (ch === '"') entreComillas = true;
    else if (ch === sep) {
      fila.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(campo);
      campo = "";
      if (fila.some((f) => f.trim() !== "")) filas.push(fila);
      fila = [];
    } else campo += ch;
  }
  fila.push(campo);
  if (fila.some((f) => f.trim() !== "")) filas.push(fila);
  return filas;
}

const RE_DNI_NIE = /\b([XYZ]\d{7}|\d{8})[A-Z]\b/i;
const RE_IBAN = /\bES\d{2}[ ]?(\d{4}[ ]?){5}\b/i;

/** Normaliza teléfonos españoles a E.164. Devuelve null si no parece válido. */
export function normalizarTelefono(t: string): string | null {
  const d = t.replace(/[^\d+]/g, "");
  if (/^\+\d{8,15}$/.test(d)) return d;
  if (/^0034\d{9}$/.test(d)) return "+" + d.slice(2);
  if (/^[6789]\d{8}$/.test(d)) return "+34" + d;
  return null;
}

export interface FilaImportada {
  datos: Partial<Record<ColumnaPermitida, string>>;
  telefonoE164: string | null;
}

export interface FilaRevision {
  numeroFila: number; // 1 = primera fila de datos
  motivo: "POSIBLE_DATO_SENSIBLE" | "TELEFONO_INVALIDO";
}

export interface ResultadoImportacion {
  columnasUsadas: ColumnaPermitida[];
  columnasDescartadas: string[]; // nombres tal como venían, para el aviso al administrador
  filas: FilaImportada[];
  enRevision: FilaRevision[];
  mensaje: string;
}

export function importarPadron(texto: string): ResultadoImportacion {
  const filas = parsearCSV(texto);
  const cabecera = filas[0] ?? [];
  const mapa: (ColumnaPermitida | null)[] = cabecera.map((c) => ALIAS[normalizarCabecera(c)] ?? null);
  const columnasUsadas = [...new Set(mapa.filter((m): m is ColumnaPermitida => m !== null))];
  const columnasDescartadas = cabecera.filter((_, i) => mapa[i] === null).map((c) => c.trim());

  const resultado: FilaImportada[] = [];
  const enRevision: FilaRevision[] = [];

  filas.slice(1).forEach((f, idx) => {
    const datos: Partial<Record<ColumnaPermitida, string>> = {};
    mapa.forEach((col, i) => {
      if (col && datos[col] === undefined) datos[col] = (f[i] ?? "").trim();
    });
    const sensible = Object.values(datos).some((v) => v && (RE_DNI_NIE.test(v) || RE_IBAN.test(v)));
    if (sensible) {
      // No se importa en silencio: la fila queda fuera hasta que el administrador la revise.
      enRevision.push({ numeroFila: idx + 1, motivo: "POSIBLE_DATO_SENSIBLE" });
      return;
    }
    const telefonoE164 = datos.telefono ? normalizarTelefono(datos.telefono) : null;
    if (datos.telefono && !telefonoE164) enRevision.push({ numeroFila: idx + 1, motivo: "TELEFONO_INVALIDO" });
    resultado.push({ datos, telefonoE164 });
  });

  const total = cabecera.length;
  const mensaje =
    columnasDescartadas.length === 0
      ? `Usaremos las ${total} columnas.`
      : `Usaremos ${columnasUsadas.length} de ${total} columnas. No subiremos ${columnasDescartadas.join(", ")}: así proteges a tu comunidad.`;

  return { columnasUsadas, columnasDescartadas, filas: resultado, enRevision, mensaje };
}
