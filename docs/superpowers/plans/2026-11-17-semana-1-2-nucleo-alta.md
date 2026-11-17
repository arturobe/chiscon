# Semanas 1–2: núcleo de datos y alta del despacho — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que un administrador invitado cree su cuenta con 2FA, acepte el contrato de encargo, declare su paquete, importe su cartera sin que ningún DNI o IBAN salga de su navegador y active sus comunidades, sobre una base de datos aislada por despacho y con todo el modelo de datos del negocio ya preparado.

**Arquitectura:**
- Un solo proyecto Next.js (App Router en `app/`). La lógica de dominio vive en `src/`, sin dependencias de Next.
- Base de datos con Drizzle sobre Postgres: Neon en producción y PGlite en los tests.
- Aislamiento por despacho con RLS de Postgres, más un filtro en código a través de `conDespacho()`.
- Tablas de solo inserción protegidas con triggers.
- Cuentas y 2FA con Better Auth (adaptador de Drizzle).

**Tecnología** (versiones comprobadas en npm el 17/11/2026):
- `drizzle-orm` 0.45.4 y `drizzle-kit` 0.31.11
- `@electric-sql/pglite` 0.5.16 (tests) y `@neondatabase/serverless` 1.2.1 (producción, a través de `drizzle-orm/neon-serverless`, que admite transacciones)
- `better-auth` 1.7.25 (`better-auth/adapters/drizzle`, `better-auth/plugins/two-factor`, `better-auth/next-js`) y `@better-auth/cli` 1.4.21
- `next` 16.4.6, `react` 19.3.1
- `papaparse` 5.7.1 y `read-excel-file` 9.3.17 (`read-excel-file/browser`)
- `vitest`, `zod` (ya instalados)

**Spec:** `docs/superpowers/specs/2026-11-17-semana-1-2-nucleo-alta-design.md`. Se leen todas sus secciones, también las añadidas el 17/11/2026. Contexto de negocio: `docs/negocio/2026-11-17-propuesta-niveles-profesionales.md`. Reglas del repositorio: `CLAUDE.md`.

## Restricciones globales

- **Invariantes de seguridad 1–10 de `CLAUDE.md`.** Ninguna tarea puede romperlas.
- **Cero laberintos.** Como máximo una decisión por pantalla, con la opción recomendada ya marcada. Cada aviso dice qué pasa y qué hacer.
- **Interfaz en español de España.** Texto base de 18 px. WCAG 2.1 AA. Fechas y teléfonos en formato español. La zona horaria de presentación es `Europe/Madrid` y en la base de datos todo se guarda en UTC.
- **Dinero en céntimos (enteros)**, nunca en decimales.
- **Columnas de la base de datos en `snake_case`** y campos de TypeScript en `camelCase`. Todas las tablas con datos de un despacho llevan `despacho_id` y RLS.
- **Secretos solo en variables de entorno:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `CODIGOS_SECRETO`, `RESEND_API_KEY`. Nunca aparecen en logs.
- **Prisma se elimina.** El esquema se traslada a Drizzle (ver la decisión en la spec).
- **Fuera de alcance:** WhatsApp, el asistente, el worker de Railway, el cartel QR (pasa a la semana 3), la red, los pagos reales y Gente de Fiar. Solo se prepara su modelo de datos.

## Riesgos que vigilar

1. **Excel con DNI o IBAN en una columna con nombre inesperado** ("NIF", "Observaciones portero") o dentro de una celda de teléfono. Esas filas van a revisión, nunca a la base de datos. Lo prueba la Tarea 12.
2. **La misma dirección escrita de dos formas** ("C/ Mayor 5" y "Calle Mayor, 5"). Tiene que salir una sola comunidad. Lo prueba la Tarea 12.
3. **Reimportar el mismo Excel dos veces.** No debe duplicar contactos ni unidades, ni cambiar códigos, ni borrar nada. Lo prueba la Tarea 12.
4. **Usuario que cierra el navegador antes de confirmar la 2FA.** Su sesión no puede acceder a ningún dato. Lo prueba la Tarea 10.
5. **Excel con varias pestañas o con celdas combinadas.** Se leen todas las pestañas y las celdas combinadas se rellenan hacia abajo. El aviso indica cuántas pestañas se han leído. Lo prueba la Tarea 12.

---

## Mapa de archivos

| Ruta | Responsabilidad |
|---|---|
| `drizzle.config.ts` | Configuración de drizzle-kit (dialecto postgresql, esquema en `src/db/schema/*.ts`, salida en `drizzle/`) |
| `src/db/schema/plataforma.ts` | `despacho`, `usuario` y las tablas de Better Auth, `invitacion`, `audit_log` |
| `src/db/schema/cartera.ts` | `comunidad`, `direccion_comunidad`, `encargo`, `autorizacion_subencargo`, `unidad_privativa`, `contacto`, `contacto_unidad`, `cargo`, `poliza_comunidad`, `autorizacion_contencion`, `proveedor_confianza`, `tercero` |
| `src/db/schema/incidencias.ts` | `incidencia`, `texto_incidencia`, `incidencia_evento`, `incidencia_interesado`, `temporizador`, `adjunto` |
| `src/db/schema/mensajeria.ts` | `enrutado_telefono`, `conversacion`, `mensaje`, `webhook_recibido`, `decision_modelo`, `opt_in`, `codigo_verificacion` |
| `src/db/schema/dinero.ts` | `suscripcion`, `linea_factura`, `profesional`, `tarifa_nocturna`, `suscripcion_profesional`, `monedero`, `movimiento_monedero`, `presupuesto`, `uso_margen`, `asignacion`, `trabajo`, `comision`, `reembolso`, `concurso`, `oferta_concurso` |
| `drizzle/0001_seguridad.sql` | Roles, RLS y triggers de solo inserción (SQL escrito a mano) |
| `src/db/cliente.ts` | `crearDb`, `conDespacho`, `comoSistema` |
| `test/db/harness.ts` | `crearBaseDePrueba()` sobre PGlite con todas las migraciones aplicadas |
| `src/plataforma/auditoria.ts` | `registrarAuditoria` |
| `src/incidencias/estados.ts` (modificar) | Estados nuevos y sus transiciones |
| `src/incidencias/repositorio.ts` | `aplicarTransicion` (estado y evento en la misma transacción, con `version`) |
| `src/identidad/repositorio-codigos.ts` | Persistencia de `CodigoVerificacion` |
| `src/dinero/comision.ts` | `calcularComision` por tramos con tope |
| `src/incidencias/contencion.ts` | `TOPES_CONTENCION_CENTS`, `dentroDeTope` |
| `src/auth/auth.ts`, `src/auth/guardas.ts`, `src/auth/invitaciones.ts` | Better Auth, guarda de 2FA, invitaciones de un solo uso |
| `src/correo/enviador.ts` | Interfaz `EnviadorCorreo`, implementación con Resend y versión en memoria para tests |
| `src/alta/dpa.ts`, `src/alta/paquete.ts` | Aceptación del DPA con código; paquete y fin de la puesta en marcha |
| `src/cartera/direcciones.ts` | `normalizarDireccion`, `agruparPorDireccion` |
| `src/cartera/lectura-archivo.ts` | Lectura de CSV y XLSX en el navegador; devuelve texto CSV para `importarPadron` |
| `src/cartera/importacion.ts` | Pasos a, b y c en el servidor (crear comunidades, declarar autorización, importar padrón) |
| `src/cartera/ficha.ts` (+ modificar `activacion.ts`) | Ficha de comunidad y activación |
| `app/**` | Pantallas y acciones de servidor (Tarea 15) |
| `docs/ux/2026-11-semana-1-2-pantallas.md` | Diseño de las pantallas validado con el agente Advocate (Tarea 14) |

---

### Tarea 1: Cambiar Prisma por Drizzle y crear la base de pruebas

**Archivos:** modificar `package.json` y `CLAUDE.md` · crear `drizzle.config.ts`, `test/db/harness.ts` y `test/db/harness.test.ts` · borrar `prisma/`.

**Interfaces que produce:**
- `crearBaseDePrueba(): Promise<{ pg: PGlite; db: Db; cerrar(): Promise<void> }>`, que aplica todas las migraciones de `drizzle/`.
- `type Db` (exportado desde `src/db/cliente.ts`): base de datos de Drizzle para Postgres, compatible con PGlite y con neon-serverless.

- [ ] **Paso 1.** Desinstalar `prisma` y `@prisma/client`. Instalar `drizzle-orm@0.45.4 @electric-sql/pglite@0.5.16 @neondatabase/serverless@1.2.1` y, como dependencia de desarrollo, `drizzle-kit@0.31.11`. Scripts: `"db:generate": "drizzle-kit generate"`; quitar `prisma:validate`.
- [ ] **Paso 2. Test que falla**, en `test/db/harness.test.ts`: `it("crea una base con las migraciones aplicadas")`. Llama a `crearBaseDePrueba()`, ejecuta `select 1 as ok` y espera `ok === 1`.
- [ ] **Paso 3.** Ejecutar `npm test -- test/db/harness.test.ts`. Resultado esperado: FALLA (no existe el módulo).
- [ ] **Paso 4.** Crear `drizzle.config.ts` y `crearBaseDePrueba()`. Usar `new PGlite()` en memoria y `migrate` de `drizzle-orm/pglite/migrator` con `migrationsFolder: "drizzle"`. Si todavía no hay ninguna migración, el harness funciona igual.
- [ ] **Paso 5.** Ejecutar `npm test`. Resultado esperado: todo pasa (los 31 tests anteriores y el nuevo).
- [ ] **Paso 6.** En `CLAUDE.md`, sustituir las líneas de Prisma por `npm run db:generate` y poner "Drizzle" en la línea de Stack. Commit: `chore: Drizzle + PGlite en lugar de Prisma`.

### Tarea 2: Esquema de plataforma y cartera (grupos 1, 2, 4 y 5 de la simulación)

**Archivos:** crear `src/db/schema/plataforma.ts`, `src/db/schema/cartera.ts`, `src/db/schema/index.ts`, la migración generada en `drizzle/` y `test/db/esquema-cartera.test.ts`.

**Regla general:** se trasladan todos los modelos equivalentes de `prisma/schema.prisma` (en el historial de git, commit `25b9b0f`) con los mismos nombres de campo. Además se aplican estos cambios, todos decididos en la spec:

| Tabla | Decisión |
|---|---|
| `despacho` | + `dpa_version`, `dpa_hash`, `dpa_aceptado_por_id`, `dpa_aceptado_en`, `software_gestion` |
| `usuario` | Modelo `user` de Better Auth renombrado a `usuario`, con `despacho_id`, `rol` (`ADMINISTRADOR`, `PERSONAL_DESPACHO`, `FUNDADOR`) y `desactivado_en`. Los usuarios nunca se borran |
| `invitacion` | `token_hash` único, `email`, `expira_en`, `usada_en`, `creada_por_id` |
| `comunidad` | Fija: `nif` (puede ser nulo), `codigo` único `C-` + 4 cifras que **nunca se reutiliza** (ni después de una baja), `distrito` nulo hasta activar, `num_viviendas_declarado`, `tiene_ascensor`, `ascensor_mantenedor`, `ascensor_telefono_24h`, `estado_alta` (`PENDIENTE_AUTORIZACION`, `LISTA_IMPORTAR`, `ACTIVA`, `SUSPENDIDA`, `BAJA_SOLICITADA`, `BAJA`), `ref_externa`. **Sin** `presidenteEmail` |
| `direccion_comunidad` | Varias por comunidad, con `direccion_normalizada` única por despacho |
| `encargo` | `comunidad_id`, `despacho_id`, `desde`, `hasta` (nulo = vigente). Índice único parcial: un solo encargo vigente por comunidad |
| `autorizacion_subencargo` | Con versiones: `tipo` (`DECLARACION_DESPACHO`, `FIRMA_PRESIDENTE`), `texto_version`, `otorgada_en`, `revocada_en`, `otorgada_por_id` |
| `unidad_privativa` | Sustituye a `vivienda`: `tipo` (`VIVIENDA`, `LOCAL`, `GARAJE`, `TRASTERO`), `portal`, `planta`, `puerta`, `uso` (`HABITUAL`, `TURISTICA`, `VACIA`, `DESCONOCIDO`) |
| `contacto` | `telefono_e164`, `email`, `nombre`, `relacion` (`PROPIETARIO`, `INQUILINO`, `GESTOR`, `CUSTODIO_LLAVES`, `AUTORIZADO`, `CONSERJE`), `actua_por_contacto_id`, `origen` (`IMPORTACION`, `QR`, `CIRCULAR`, `DESPACHO`), `informado_art14_en`, `verificado_por`, `verificado_en`, `anonimizado_en` |
| `contacto_unidad` | Relación muchos a muchos entre contacto y unidad privativa |
| `cargo` | `contacto_id`, `cargo` (`PRESIDENTE`, `VICEPRESIDENTE`), `desde`, `hasta`, `designado_por_id` |
| `poliza_comunidad` | `aseguradora`, `numero`, `telefono_24h`, `coberturas` (jsonb), `plazo_llegada_horas` |
| `autorizacion_contencion` | `topes_cents` (jsonb por oficio), `firmada_por_id`, `texto_version`, `texto_hash`, `firmada_en`, `revocada_en` |
| `proveedor_confianza` | `despacho_id`, `comunidad_id` (nulo = todo el despacho), `oficio`, `orden` (1–3), `profesional_id`, `permite_otros_despachos`. Único (ámbito, oficio, orden) |
| `audit_log` | `despacho_id`, `actor_tipo`, `actor_id`, `accion` (código cerrado), `objeto_tipo`, `objeto_id`, `creado_en`, `metadatos` (jsonb **sin texto libre ni datos personales**) |

- [ ] **Paso 1. Tests que fallan**, en `test/db/esquema-cartera.test.ts`:
  - `it("rechaza dos encargos vigentes para la misma comunidad")`: el segundo insert lanza un error.
  - `it("rechaza un código de comunidad repetido")`.
  - `it("rechaza dos proveedores de confianza con el mismo ámbito, oficio y orden")`.
  - `it("no tiene columna presidente_email en comunidad")`: se consulta `information_schema.columns` y el resultado tiene 0 filas.
- [ ] **Paso 2.** Ejecutar el test. Resultado esperado: FALLA.
- [ ] **Paso 3.** Escribir los dos archivos de esquema. Generar la migración con `npm run db:generate`. Generar las tablas de Better Auth con `npx @better-auth/cli generate` y adaptarlas a `usuario`.
- [ ] **Paso 4.** Ejecutar el test. Resultado esperado: PASA. `npm run typecheck` también pasa.
- [ ] **Paso 5.** Commit: `feat(db): esquema de plataforma y cartera en Drizzle`.

### Tarea 3: Esquema de incidencias, mensajería y dinero (grupos 3, 6 y 7)

**Archivos:** crear `src/db/schema/incidencias.ts`, `mensajeria.ts` y `dinero.ts`, la migración generada y `test/db/esquema-resto.test.ts`.

Mismas reglas de traslado que en la Tarea 2. Decisiones de esta tarea:

| Tabla | Decisión |
|---|---|
| `incidencia` | + `version` (int, por defecto 0), `unidad_origen_id`, `derivada_de_id`, `reabierta_de_id`, `contencion_tope_cents`, `contencion_usada_cents`. **Sin** columnas de texto libre |
| `texto_incidencia` | `descripcion_original` (solo la ve el despacho), `resumen_neutro` (lo único que ve el modelo y se muestra), `anonimizado_en`, `bloqueado_en`, `conservar_hasta` |
| `incidencia_evento` | `tipo`, `desde`, `hasta`, `actor_tipo`, `actor_id`, `codigo_motivo`, `creado_en`. Solo identificadores y códigos cerrados |
| `incidencia_interesado` | (`incidencia_id`, `contacto_id`) único |
| `adjunto` | `clave_almacen`, `tipo`, `caduca_en`, `borrado_en` |
| `enrutado_telefono` | **Sin RLS.** `telefono_hash` (HMAC), `contacto_ids` (uuid[]), `idioma`, `baja_global_en`. No guarda el teléfono en claro |
| `conversacion`, `mensaje`, `webhook_recibido`, `decision_modelo` | `mensaje.wamid` único. `webhook_recibido` con (`proveedor`, `id_externo`) único. `decision_modelo`: `modelo`, `version_prompt`, `regla_disparada`, `salida` (jsonb), `latencia_ms`, `tokens_entrada`, `tokens_salida`, `coste_microcents`, `respaldo` |
| `suscripcion` | `paquete_comunidades`, `firmado_en`, `fin_puesta_en_marcha`, `estado` (`AL_DIA`, `IMPAGO`, `SUSPENDIDA`, `RESCINDIDA`), `fundador` (bool), `fundador_cartera_completa` (bool) |
| `linea_factura` | `mes`, `comunidad_id`, `tramo`, `precio_cents`, `descuento_pct` |
| `profesional` | + `nivel` (`NINGUNO`, `PORTAL`, `BARRIO`, `VILLA`), `credenciales` (jsonb con caducidades), `capacidad_simultanea` (por defecto 1), `zona` (jsonb: distritos) |
| `tarifa_nocturna` | `profesional_id`, `oficio`, `salida_cents`, `hora_cents`, `recargo_cents` |
| `monedero` / `movimiento_monedero` | Movimientos de solo inserción, con `tipo` (`RECARGA`, `COMISION`, `DEVOLUCION_SALDO`, `CUOTA_NIVEL`) y `importe_cents` con signo. El saldo es la suma de los movimientos |
| `presupuesto` | `version`, `sustituye_a_id`, `asignacion_id`, `lineas` (jsonb estructurado), `contenido_hash`, `margen_pct` (por defecto 10), `firmado_en` |
| `uso_margen`, `asignacion`, `trabajo`, `comision`, `reembolso` | `asignacion`: índice único parcial con una sola aceptada por incidencia; `canal` (`CONFIANZA`, `RED`); `motivo_paso` (`NO_RESPONDE`, `RECHAZA`, `SIN_GUARDIA`). `trabajo.pagador` (`COMUNIDAD`, `VECINO`, `ASEGURADORA`) |
| `concurso` / `oferta_concurso` | `max_ofertas` (por defecto 4), `min_ofertas` (2), `estado`; la oferta lleva `por_sorteo` (bool) |

- [ ] **Paso 1. Tests que fallan**, en `test/db/esquema-resto.test.ts`:
  - `it("rechaza un segundo mensaje con el mismo wamid")`.
  - `it("rechaza dos asignaciones aceptadas para la misma incidencia")`.
  - `it("la tabla incidencia no tiene columnas de texto libre")`: ninguna columna `text` aparte de las de códigos o enumeraciones; se comprueba contra una lista blanca de nombres de columna.
- [ ] **Paso 2.** Ejecutar el test. Resultado esperado: FALLA.
- [ ] **Paso 3.** Escribir los esquemas y generar la migración.
- [ ] **Paso 4.** `npm test` y `npm run typecheck` pasan.
- [ ] **Paso 5.** Commit: `feat(db): esquema de incidencias, mensajería y dinero`.

### Tarea 4: Seguridad en la base de datos (RLS y solo inserción)

**Archivos:** crear `drizzle/0001_seguridad.sql`, registrado en el journal de migraciones con `drizzle-kit generate --custom`, y `test/db/seguridad.test.ts`.

**Lo que establece la migración:**
- **Roles:** `app_tenant` (NOLOGIN), con `SELECT, INSERT, UPDATE` sobre las tablas de despacho, y `app_sistema`, solo para `enrutado_telefono`, `invitacion` y las tablas de Better Auth.
- **RLS:** `ENABLE` + `FORCE ROW LEVEL SECURITY` en todas las tablas que tienen `despacho_id`, con la política `despacho_id = current_setting('app.despacho_id', true)::uuid` en `USING` y en `WITH CHECK`.
- **Solo inserción:** función `rechazar_cambio()` que hace `RAISE EXCEPTION 'tabla de solo inserción'`, y triggers `BEFORE UPDATE OR DELETE` en `incidencia_evento`, `audit_log`, `movimiento_monedero`, `mensaje` y `decision_modelo`.

- [ ] **Paso 1. Tests que fallan:**
  - `it("el despacho A no ve filas del despacho B aunque la consulta no filtre")`.
  - `it("el despacho A no puede insertar con despacho_id de B")`.
  - `it("rechaza UPDATE y DELETE en incidencia_evento")`.
  - `it("rechaza UPDATE en audit_log")`.

  Los tres primeros usan `set local role app_tenant` y `set_config` dentro de una transacción, igual que la prueba de concepto de la spec.
- [ ] **Paso 2.** Ejecutar el test. Resultado esperado: FALLA.
- [ ] **Paso 3.** Escribir el SQL.
- [ ] **Paso 4.** Los tests pasan.
- [ ] **Paso 5.** Commit: `feat(db): RLS por despacho y tablas de solo inserción`.

### Tarea 5: Capa de acceso a datos

**Archivos:** crear `src/db/cliente.ts` y `test/db/cliente.test.ts`.

**Interfaces que produce:**
- `crearDb(url: string): Db`. Usa `drizzle-orm/neon-serverless` con `Pool`.
- `conDespacho<T>(db: Db, despachoId: string, fn: (tx: Tx) => Promise<T>): Promise<T>`. Abre una transacción, ejecuta `set local role app_tenant` y `select set_config('app.despacho_id', $1, true)`, y después `fn`.
- `comoSistema<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T>`. Igual, pero con `app_sistema`.
- `type Tx`.

- [ ] **Paso 1. Tests que fallan:**
  - `it("conDespacho solo devuelve datos del despacho indicado")`.
  - `it("si fn lanza un error, la transacción se deshace")`.
  - `it("rechaza un despachoId que no es uuid")`: lanza un error antes de abrir la transacción.
- [ ] **Paso 2.** Ejecutar el test. Resultado esperado: FALLA. **Paso 3.** Implementar. **Paso 4.** Los tests pasan.
- [ ] **Paso 5.** Commit: `feat(db): conDespacho y comoSistema`.

### Tarea 6: Registro de auditoría

**Archivos:** crear `src/plataforma/auditoria.ts` y `test/plataforma/auditoria.test.ts`.

**Interfaz que produce:**

```ts
registrarAuditoria(tx: Tx, e: {
  despachoId: string;
  actorTipo: ActorTipo;
  actorId?: string;
  accion: AccionAuditoria;
  objetoTipo: string;
  objetoId: string;
  metadatos?: Record<string, string | number | boolean>;
}): Promise<void>
```

`AccionAuditoria` es una unión cerrada con estos valores: `ALTA_DESPACHO`, `INVITACION_USADA`, `LOGIN`, `2FA_ACTIVADA`, `2FA_RESTABLECIDA`, `DPA_ACEPTADO`, `AUTORIZACION_DECLARADA`, `IMPORTACION`, `COMUNIDAD_ACTIVADA`, `AUTORIZACION_CONTENCION_FIRMADA`, `ACCESO_COMUNIDAD`.

- [ ] **Paso 1. Tests que fallan:**
  - `it("registra la acción con despacho y objeto")`.
  - `it("rechaza metadatos que contengan texto de más de 64 caracteres")`, para que no se cuele texto libre.
- [ ] **Pasos 2–4.** Ver el test fallar, implementar y ver que pasa.
- [ ] **Paso 5.** Commit: `feat: auditoría de solo inserción`.

### Tarea 7: Estados nuevos y `transicionar()` persistente

**Archivos:** modificar `src/incidencias/estados.ts` y `test/estados.test.ts` · crear `src/incidencias/repositorio.ts` y `test/incidencias/repositorio.test.ts`.

**Estados y transiciones que se añaden** (spec: grupo 6 y urgencias nocturnas):
- `VISITA_DIAGNOSTICO`: desde `ACEPTADA`. Va a `PENDIENTE_APROBACION` o a `CERRADA`.
- `CONTENCION_URGENTE`: desde `ACEPTADA` o `EN_CAMINO`, solo si `urgenciaFinal` es `U1` o `U2` y hay una autorización de contención vigente. Va a `PENDIENTE_APROBACION` (para la reparación) o a `RESUELTA`.
- `EN_CURSO` → `PENDIENTE_APROBACION`: ampliación.
- `EN_CAMINO` → `ANULADA`.
- Cierre `FALSA_ALARMA`: es el valor de `codigoMotivo` al pasar a `ANULADA`, no un estado nuevo.

**Interfaz que produce:**

```ts
aplicarTransicion(db: Db, despachoId: string, incidenciaId: string, hasta: Estado,
                  ctx: ContextoTransicion & { versionEsperada: number })
  : Promise<ResultadoTransicion | { ok: false; error: "CONFLICTO_VERSION" }>
```

Dentro de `conDespacho`: lee la incidencia, llama a `transicionar()`, hace `UPDATE … SET estado, version = version + 1 WHERE id = ? AND version = ?` e inserta el evento.

- [ ] **Paso 1. Tests de dominio que fallan** (en `estados.test.ts`):
  - `it("CONTENCION_URGENTE exige U1 o U2 y autorización de contención")`.
  - `it("EN_CURSO puede volver a PENDIENTE_APROBACION por ampliación")`.
  - `it("EN_CAMINO puede pasar a ANULADA")`.
- [ ] **Paso 2. Tests de repositorio que fallan:**
  - `it("guarda estado y evento juntos")`.
  - `it("si falla la inserción del evento, el estado no cambia")`: se fuerza el fallo con un actor inválido.
  - `it("dos transiciones con la misma versión: la segunda devuelve CONFLICTO_VERSION")`.
- [ ] **Pasos 3–5.** Ver los tests fallar, implementar y ver que pasan. Los 31 tests anteriores siguen pasando.
- [ ] **Paso 6.** Commit: `feat(incidencias): estados de contención y transición persistente`.

### Tarea 8: Persistencia de los códigos de verificación

**Archivos:** crear `src/identidad/repositorio-codigos.ts` y `test/identidad/repositorio-codigos.test.ts`.

**Interfaces que produce:**
- `guardarCodigo(tx: Tx, despachoId: string, accion: AccionVerificada, registro: RegistroCodigo): Promise<string /* id */>`
- `comprobarCodigo(tx: Tx, id: string, codigo: string, documento: string | Buffer, secreto: string, ahora?: Date): Promise<ResultadoVerificacion>`

Reutiliza `verificarCodigo()`. Si falla, incrementa `intentos`. Si acierta, marca `usado_en`.

- [ ] **Paso 1. Tests que fallan:**
  - `it("acepta el código correcto una sola vez")`.
  - `it("bloquea al tercer intento fallido")`.
  - `it("rechaza el código si el documento ha cambiado (hash distinto)")`.
  - `it("rechaza el código a los 10 minutos")`.
- [ ] **Pasos 2–4.** Ver los tests fallar, implementar y ver que pasan. Revisar con la skill `agentic-council:cipher-crypto-review` antes del commit.
- [ ] **Paso 5.** Commit: `feat(identidad): códigos de verificación persistentes`.

### Tarea 9: Reglas de dinero (comisión por tramos y topes de contención)

**Archivos:** crear `src/dinero/comision.ts`, `src/incidencias/contencion.ts` y `test/dinero/reglas.test.ts`.

**Interfaces que produce:**
- `calcularComision(baseCents: number, conNivel: boolean): number`
  - Sin nivel: tramos 0–300.000 al 12 %, 300.000–2.000.000 al 5 % y lo que pase de 2.000.000 al 2 %, con un máximo de 150.000.
  - Con nivel: 5 %, 3 % y 1 %, con un máximo de 100.000.
  - El resultado se redondea al céntimo.
- `TOPES_CONTENCION_CENTS: Record<"FONTANERIA" | "ELECTRICIDAD" | "DESATASCO" | "CERRAJERIA" | "ASCENSOR", number>`, con los valores 25000, 25000, 25000, 18000 y 0.
- `dentroDeTope(oficio, importeCents, topes = TOPES_CONTENCION_CENTS): boolean`

- [ ] **Paso 1. Tests que fallan:**

```ts
expect(calcularComision(150_000, false)).toBe(18_000);
expect(calcularComision(1_500_000, false)).toBe(96_000);
expect(calcularComision(6_000_000, false)).toBe(150_000);
expect(calcularComision(150_000, true)).toBe(7_500);
expect(calcularComision(1_500_000, true)).toBe(51_000);
expect(calcularComision(6_000_000, true)).toBe(100_000);
expect(dentroDeTope("CERRAJERIA", 18_001)).toBe(false);
expect(dentroDeTope("ASCENSOR", 1)).toBe(false);
```

- [ ] **Pasos 2–4.** Ver los tests fallar, implementar y ver que pasan.
- [ ] **Paso 5.** Commit: `feat(dinero): comisión por tramos con tope y topes de contención`.

### Tarea 10: Cuentas, 2FA obligatoria e invitaciones

**Archivos:** instalar `better-auth@1.7.25` · crear `src/auth/auth.ts`, `src/auth/guardas.ts`, `src/auth/invitaciones.ts` y `test/auth/*.test.ts`.

**Interfaces que produce:**
- `crearAuth(db: Db, opciones: { secreto: string; enviador: EnviadorCorreo })`. Better Auth con `drizzleAdapter`, modelo de usuario `usuario`, inicio de sesión con email y contraseña, y el plugin `twoFactor` (TOTP y 10 códigos de recuperación).
- `exigirSesionCompleta(sesion): { ok: true; usuarioId; despachoId } | { ok: false; destino: "/entrar" | "/configurar-2fa" }`. Una sesión sin 2FA confirmada solo puede ir a `/configurar-2fa`.
- `crearInvitacion(db, email, creadaPorId): Promise<{ enlace: string }>`, con caducidad de 7 días y el token guardado como hash.
- `canjearInvitacion(db, token): Promise<{ ok: true; email } | { ok: false; motivo: "CADUCADA" | "USADA" | "NO_EXISTE" }>`
- El registro sin una invitación válida se rechaza con un hook `before` de Better Auth.
- `restablecer2FA(db, usuarioId, porFundadorId, enviador)`. Borra el factor del usuario, registra `2FA_RESTABLECIDA` y avisa por correo al titular (decisión 6 de la spec).

- [ ] **Paso 1. Tests que fallan:**
  - `it("rechaza el registro sin invitación")`.
  - `it("una invitación solo se puede usar una vez")`.
  - `it("una sesión sin 2FA confirmada solo puede ir a /configurar-2fa")`: cubre el riesgo 4.
  - `it("un usuario desactivado no puede iniciar sesión")`.
  - `it("restablecer la 2FA deja auditoría y avisa al titular por correo")`.
- [ ] **Pasos 2–4.** Ver los tests fallar, implementar y ver que pasan. Revisar con `agentic-council:skeptic-threat-model` antes del commit.
- [ ] **Paso 5.** Commit: `feat(auth): cuentas con 2FA obligatoria e invitaciones`.

### Tarea 11: Alta del despacho (datos, DPA y paquete)

**Archivos:** crear `src/correo/enviador.ts`, `src/alta/dpa.ts`, `src/alta/paquete.ts`, `docs/legal/dpa-v0-PROVISIONAL.md` (borrador marcado **PROVISIONAL — pendiente del abogado**) y `test/alta/*.test.ts`.

**Interfaces que produce:**
- `interface EnviadorCorreo { enviar(a: string, asunto: string, texto: string): Promise<void> }`. Hay dos implementaciones: `EnviadorResend` y `EnviadorEnMemoria`, esta última con `enviados[]`.
- `iniciarAceptacionDpa(db, despachoId, usuarioId, enviador): Promise<{ codigoId: string }>`. Calcula el hash del texto del DPA en su versión actual, emite un código ligado a ese hash y lo envía por correo.
- `confirmarAceptacionDpa(db, despachoId, usuarioId, codigoId, codigo): Promise<ResultadoVerificacion>`. Si es correcto, guarda `dpa_version`, `dpa_hash`, `dpa_aceptado_por_id` y `dpa_aceptado_en`, y registra `DPA_ACEPTADO`.
- `declararPaquete(db, despachoId, { comunidades: number; fundador: boolean; carteraCompleta: boolean }, ahora): Promise<void>`. Crea la `suscripcion` con `fin_puesta_en_marcha` = `ahora` + 30 días. Si `fundador && !carteraCompleta`, no aplica el descuento.
- `descuentoFundadorAplicable(s: { fundador: boolean; carteraCompleta: boolean; mesDesdeFirma: number }): number`. Devuelve 30 si se cumple todo y el mes es como máximo el 12; si no, 0.

- [ ] **Paso 1. Tests que fallan:**
  - `it("el DPA queda aceptado solo con el código correcto y guarda versión y hash")`.
  - `it("cambiar el texto del DPA invalida un código ya enviado")`.
  - `it("la puesta en marcha termina 30 días después de la firma")`.
  - `it("sin cartera completa no hay descuento de fundador")`.
  - `it("el descuento de fundador termina en el mes 13")`.
- [ ] **Pasos 2–4.** Ver los tests fallar, implementar y ver que pasan.
- [ ] **Paso 5.** Commit: `feat(alta): DPA con código y paquete del despacho`.

### Tarea 12: Importación de la cartera (pasos a, b y c)

**Archivos:** instalar `papaparse@5.7.1`, `@types/papaparse@5.5.2` y `read-excel-file@9.3.17` · crear `src/cartera/direcciones.ts`, `src/cartera/lectura-archivo.ts`, `src/cartera/importacion.ts` y `test/cartera/importacion.test.ts` · modificar `src/cartera/csv.ts`.

**Interfaces que produce:**
- `normalizarDireccion(s: string): string`. Pasa a minúsculas, quita tildes, cambia "c/", "c." y "cl" por "calle", "avda" por "avenida" y "pza" por "plaza", y quita la puntuación y los espacios repetidos.
- `agruparPorDireccion(filas: FilaImportada[]): Map<string /* normalizada */, FilaImportada[]>`
- `leerArchivo(archivo: File): Promise<{ textoCsv: string; pestanasLeidas: number }>`. Es solo para el navegador. Lee todas las pestañas del XLSX y rellena hacia abajo las celdas combinadas que llegan vacías en la columna de dirección.
- En `csv.ts`: `normalizarTelefono` acepta `00` seguido de cualquier prefijo internacional, y una celda con dos teléfonos ("600111222 / 913…") se divide en dos contactos. También se añade la columna `relacion` a `COLUMNAS_PERMITIDAS`.
- En el servidor (`importacion.ts`):
  - `crearComunidades(db, despachoId, direcciones: string[]): Promise<{ creadas: number; existentes: number }>`. Paso a: solo direcciones; reutiliza la comunidad si la dirección normalizada ya existe.
  - `declararAutorizacion(db, despachoId, usuarioId, comunidadIds: string[] | "TODAS"): Promise<void>`. Paso b: pasa las comunidades a `LISTA_IMPORTAR`.
  - `importarPadronAutorizadas(db, despachoId, grupos: { direccion: string; filas: FilaImportada[] }[]): Promise<{ importadas: number; ignoradasSinAutorizacion: number; actualizadas: number }>`. Paso c: vuelve a aplicar la lista blanca en el servidor, ignora las comunidades no autorizadas y hace upsert por (comunidad, teléfono) y por (portal, planta, puerta) sin borrar nunca. Si el Excel marca un contacto como presidente, solo se toma como sugerencia y no crea ningún `cargo`.

- [ ] **Paso 1. Tests que fallan:**
  - `it("una fila con DNI en una columna llamada NIF va a revisión y no llega al servidor")`: riesgo 1.
  - `it("un IBAN dentro de la celda de teléfono va a revisión")`: riesgo 1.
  - `it("'C/ Mayor 5' y 'Calle Mayor, 5' son la misma comunidad")`: riesgo 2.
  - `it("importar dos veces el mismo padrón no duplica nada ni cambia códigos")`: riesgo 3.
  - `it("los contactos de una comunidad sin autorización se ignoran")`.
  - `it("rellena hacia abajo la dirección de las celdas combinadas")`: riesgo 5, sobre la función pura que recibe una matriz de celdas.
  - `it("'001 713 555 0100' se normaliza a +17135550100")`.
  - `it("rol presidente en el Excel no crea ningún cargo")`.
- [ ] **Pasos 2–4.** Ver los tests fallar, implementar y ver que pasan. Revisar con `agentic-council:guardian-compliance-review` antes del commit.
- [ ] **Paso 5.** Commit: `feat(cartera): importación en tres pasos sin datos sensibles`.

### Tarea 13: Ficha de comunidad y activación

**Archivos:** modificar `src/cartera/activacion.ts` y `test/cartera.test.ts` · crear `src/cartera/ficha.ts` y `test/cartera/ficha.test.ts`.

**Lo que tiene que estar completo para activar** (`faltasParaActivar`; sigue diciendo qué falta y quién lo resuelve):
- DPA aceptado.
- Autorización de subencargo vigente.
- `distrito`.
- `num_viviendas_declarado`.
- Póliza con aseguradora, número y teléfono 24 h.
- Si tiene ascensor: mantenedor y teléfono 24 h.
- Un `cargo` PRESIDENTE vigente con email.
- `autorizacion_contencion` firmada.
- Al menos un contacto importado.

**Interfaces que produce:**
- `actualizarFicha(db, despachoId, comunidadId, cambios: FichaComunidad): Promise<Falta[]>`
- `designarPresidente(db, despachoId, comunidadId, contactoId, designadoPorId): Promise<void>`. Cierra el cargo anterior (`hasta` = ahora).
- `firmarAutorizacionContencion(db, despachoId, comunidadId, usuarioId, codigoId, codigo): Promise<ResultadoVerificacion>`. Usa `TOPES_CONTENCION_CENTS` como topes por defecto y el texto provisional de `docs/legal/`.
- `activarComunidad(db, despachoId, comunidadId): Promise<{ ok: true } | { ok: false; faltas: Falta[] }>`. Registra `COMUNIDAD_ACTIVADA`.

- [ ] **Paso 1. Tests que fallan:**
  - `it("no activa sin póliza con teléfono 24 h")`.
  - `it("no exige mantenedor de ascensor si la comunidad no tiene ascensor")`.
  - `it("designar un presidente nuevo cierra el cargo del anterior")`.
  - `it("activa cuando no falta nada y deja auditoría")`.
- [ ] **Pasos 2–4.** Ver los tests fallar, implementar y ver que pasan.
- [ ] **Paso 5.** Commit: `feat(cartera): ficha y activación de comunidad`.

### Tarea 14: Diseño de las pantallas con el especialista en experiencia de usuario (antes de programarlas)

**Archivos:** crear `docs/ux/2026-11-semana-1-2-pantallas.md`.

- [ ] **Paso 1.** Lanzar el agente `agentic-council:Advocate`. Le encargamos simular a un administrador de 60 años y a una empleada de un despacho en las 8 pantallas de la spec:
  1. Crear cuenta desde la invitación.
  2. Configurar la 2FA.
  3. Datos del despacho y paquete.
  4. Contrato de encargo.
  5. Importar (pasos a, b y c en una sola pantalla con avance).
  6. Lista de comunidades.
  7. Ficha de comunidad.
  8. Autorización de contención.

  Para cada pantalla debe entregar la única decisión que se pide, la opción ya marcada, los textos exactos y los estados de vacío, error, carga y éxito. Con la skill `design:ux-copy` se ajustan los textos y con `agentic-council:advocate-a11y-audit` se revisa la accesibilidad del diseño.
- [ ] **Paso 2.** Guardar el resultado en el documento y comprobar que ninguna pantalla pide más de una decisión. Si alguna lo hace, se rediseña.
- [ ] **Paso 3.** Commit: `docs(ux): diseño de pantallas de alta`.

### Tarea 15: Aplicación web (pantallas y acciones de servidor)

**Archivos:** instalar `next@16.4.6`, `react@19.3.1` y `react-dom@19.3.1` · crear `app/layout.tsx` (18 px de base, `lang="es"`), `app/(publico)/invitacion/[token]/page.tsx`, `app/(publico)/entrar/page.tsx`, `app/configurar-2fa/page.tsx`, `app/(despacho)/alta/*`, `app/(despacho)/comunidades/page.tsx`, `app/(despacho)/comunidades/[id]/page.tsx`, `app/api/auth/[...all]/route.ts`, `middleware.ts` (aplica `exigirSesionCompleta`) y `test/app/acciones.test.ts`. Scripts: `"dev": "next dev"`, `"build": "next build"`.

**Reglas:**
- Las pantallas usan los textos de la Tarea 14 sin cambiarlos.
- Toda acción de servidor obtiene el `despachoId` de la sesión, nunca de la petición, y llama a las funciones de las Tareas 11 a 13.
- La lectura del archivo y la lista blanca se ejecutan en un componente de cliente. Al servidor solo llegan los grupos ya filtrados.

- [ ] **Paso 1. Tests que fallan:**
  - `it("una acción de servidor ignora un despachoId enviado en el cuerpo")`.
  - `it("la acción de importar rechaza columnas fuera de la lista blanca aunque lleguen")`.
- [ ] **Pasos 2–4.** Ver los tests fallar, implementar y ver que pasan.
- [ ] **Paso 5.** `npm run build` termina sin errores. Revisar las pantallas con `agentic-council:advocate-a11y-audit`.
- [ ] **Paso 6.** Commit: `feat(app): alta del despacho, importación y ficha`.

### Tarea 16: Verificación final

- [ ] **Paso 1.** Ejecutar `npm test`, `npm run typecheck` y `npm run build`. Las tres deben terminar en verde (mostrar la salida, según `superpowers:verification-before-completion`).
- [ ] **Paso 2.** Revisar con `engineering:code-review` y `superpowers:requesting-code-review` sobre toda la rama.
- [ ] **Paso 3.** Actualizar el README: cómo arrancar en local, las variables de entorno necesarias y que la conexión real con Neon se valida fuera del entorno de desarrollo.
- [ ] **Paso 4.** Commit y push: `chore: cierre semanas 1–2`.
