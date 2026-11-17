# Plataforma de mantenimiento para comunidades de Madrid

Lanzamiento completo previsto: 15/2/2027. Diseño y PRD: sesión del consejo (`design.md`, `prd.md`).

## Estado (semana 1)

Hecho, con pruebas (31 en verde):

- `prisma/schema.prisma`: modelo de datos del núcleo. Despacho como tenant, comunidades con estado de alta, contactos con niveles de identidad, opt-in, códigos de verificación, póliza y teléfono 24 h, profesionales y guardias, incidencias con evento de solo inserción, temporizadores y auditoría.
- `src/incidencias/estados.ts`: máquina de estados.
  - Aprobación después de *Aceptada*.
  - Puerta de presupuesto firmado (Decreto 35/1995) y aprobación por umbral; urgencias por LPH art. 20.
  - Urgencia final = máx(reglas, modelo); U1 no baja nunca.
- `src/cartera/csv.ts`: importación del padrón con lista blanca.
  - Descarta DNI, IBAN y observaciones antes de subir.
  - Marca para revisión las filas con datos sensibles escondidos.
  - Normaliza teléfonos a E.164.
- `src/cartera/activacion.ts`: PENDIENTE_AUTORIZACION → LISTA_IMPORTAR → ACTIVA. Sin teléfono 24 h no se activa; cada bloqueo dice qué falta y quién lo resuelve.
- `src/identidad/`: niveles N0/N1/N2/N2P y códigos de 6 cifras.
  - El código va ligado al hash del documento: 10 min, 3 intentos, enlace de 1 uso y 72 h.
  - Nunca se guarda en claro.

## Siguiente

1. Next.js (web) + worker y conexión a Neon.
2. `transicionar()` persistente: estado y evento en una sola transacción.
3. RLS por despacho.
4. Alta del administrador con 2FA y DPA.
5. Pantalla de importación.

## Comandos

```
npm test          # pruebas
npm run typecheck # tipos
```
