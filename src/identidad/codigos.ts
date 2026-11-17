// Códigos de un solo uso ligados al hash del documento (N2 / N2P).
// Código: 6 cifras, 10 minutos, 3 intentos. Enlace: 1 uso, 72 horas. Nunca se guarda el código en claro.

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const CODIGO_MINUTOS = 10;
export const ENLACE_HORAS = 72;
export const MAX_INTENTOS = 3;

export function sha256(datos: string | Buffer): string {
  return createHash("sha256").update(datos).digest("hex");
}

function hmac(secreto: string, valor: string): string {
  return createHmac("sha256", secreto).update(valor).digest("hex");
}

export interface CodigoEmitido {
  codigo: string; // se envía al teléfono N1; no se persiste
  enlaceToken: string; // va en el enlace; no se persiste
  registro: RegistroCodigo; // esto sí se persiste
}

export interface RegistroCodigo {
  objetoId: string;
  objetoSha256: string;
  codigoHash: string;
  enlaceTokenHash: string;
  codigoExpiraEn: Date;
  enlaceExpiraEn: Date;
  intentos: number;
  usadoEn: Date | null;
}

export function emitirCodigo(
  secreto: string,
  objetoId: string,
  documento: string | Buffer,
  ahora = new Date(),
): CodigoEmitido {
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const enlaceToken = randomBytes(32).toString("base64url");
  const objetoSha256 = sha256(documento);
  return {
    codigo,
    enlaceToken,
    registro: {
      objetoId,
      objetoSha256,
      codigoHash: hmac(secreto, `${objetoId}:${objetoSha256}:${codigo}`),
      enlaceTokenHash: sha256(enlaceToken),
      codigoExpiraEn: new Date(ahora.getTime() + CODIGO_MINUTOS * 60_000),
      enlaceExpiraEn: new Date(ahora.getTime() + ENLACE_HORAS * 3_600_000),
      intentos: 0,
      usadoEn: null,
    },
  };
}

export type ResultadoVerificacion =
  | { ok: true; registro: RegistroCodigo }
  | {
      ok: false;
      motivo: "ENLACE_INVALIDO" | "YA_USADO" | "ENLACE_CADUCADO" | "CODIGO_CADUCADO" | "DEMASIADOS_INTENTOS" | "DOCUMENTO_CAMBIADO" | "CODIGO_INCORRECTO";
      registro: RegistroCodigo;
    };

/**
 * Verifica enlace + código contra el documento que se va a firmar AHORA.
 * Si el documento cambió (otra versión del presupuesto), la firma no vale.
 */
export function verificarCodigo(
  secreto: string,
  registro: RegistroCodigo,
  enlaceToken: string,
  codigo: string,
  documentoActual: string | Buffer,
  ahora = new Date(),
): ResultadoVerificacion {
  const r = { ...registro };
  const a = Buffer.from(sha256(enlaceToken));
  const b = Buffer.from(r.enlaceTokenHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, motivo: "ENLACE_INVALIDO", registro: r };
  if (r.usadoEn) return { ok: false, motivo: "YA_USADO", registro: r };
  if (ahora > r.enlaceExpiraEn) return { ok: false, motivo: "ENLACE_CADUCADO", registro: r };
  if (r.intentos >= MAX_INTENTOS) return { ok: false, motivo: "DEMASIADOS_INTENTOS", registro: r };
  if (ahora > r.codigoExpiraEn) return { ok: false, motivo: "CODIGO_CADUCADO", registro: r };
  if (sha256(documentoActual) !== r.objetoSha256) return { ok: false, motivo: "DOCUMENTO_CAMBIADO", registro: r };

  r.intentos += 1;
  const esperado = Buffer.from(r.codigoHash);
  const recibido = Buffer.from(hmac(secreto, `${r.objetoId}:${r.objetoSha256}:${codigo}`));
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido))
    return { ok: false, motivo: r.intentos >= MAX_INTENTOS ? "DEMASIADOS_INTENTOS" : "CODIGO_INCORRECTO", registro: r };

  r.usadoEn = ahora;
  return { ok: true, registro: r };
}
