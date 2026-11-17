# Diseño — Semanas 1–2: núcleo y alta del despacho

Fecha: 17/11/2026 · Ventana: 17–30 nov 2026 · Historias: US-001, US-002, US-003, US-015 (`docs/consejo/prd.md`).
Aprobado por Arturo (fundador) el 17/11/2026: enfoque y diseño resumido.

## Intención

Que un administrador de fincas de Madrid pueda, el mismo día y en menos de 30 minutos, crear su cuenta segura, aceptar el contrato de encargo (DPA) y cargar su cartera de comunidades. Así queda lista la base sobre la que llegan el asistente de WhatsApp (semana 3) y la red (semana 6). Por qué ahora: todo lo demás depende de tener comunidades, contactos e incidencias guardados con seguridad y aislados por despacho.

## Objetivos

1. **Web desplegable** (Next.js) con cuenta de personal del despacho y 2FA obligatoria por app de autenticación (TOTP).
2. **Alta del despacho en 5 pasos:** cuenta → 2FA → datos del despacho → aceptar DPA (casilla + código de 6 cifras por correo) → importar.
3. **Importación del padrón en el navegador** con la lista blanca existente (`src/cartera/csv.ts`). Las columnas descartadas y las filas con posible DNI/IBAN no salen del navegador. Se informa de lo descartado y de las filas que quedan en revisión.
4. **Ficha de comunidad** para completar lo que el Excel no trae y que bloquea la activación: distrito, teléfono 24 h, mantenedora de ascensor (o "sin ascensor"), correo del presidente y tipo de autorización de subencargo. La lógica de bloqueo ya existe en `src/cartera/activacion.ts`.
5. **Estados de alta persistidos:** PENDIENTE_AUTORIZACION → LISTA_IMPORTAR → ACTIVA. Cada falta muestra qué falta y quién lo resuelve.
6. **Cartel QR y circular por comunidad** activa: página imprimible con el código de la comunidad (C-XXXX) y su QR a WhatsApp (el número es provisional hasta tener Meta).
7. **`transicionar()` persistente:** cambia el estado de la incidencia y escribe el `IncidenciaEvento` en la misma transacción. Es la única vía para cambiar estados. En estas semanas no hay pantalla de incidencias; se prueba con tests.
8. **Aislamiento por despacho:** RLS en Postgres en todas las tablas con datos de cartera, además del filtro en la capa de acceso.
9. **Auditoría (US-015):** `AuditLog` de solo inserción para alta, aceptación del DPA, importación, activación, inicio de sesión y acceso a datos de una comunidad.
10. **Niveles de identidad (US-002):** las funciones puras ya existen. Aquí se añade la persistencia de `CodigoVerificacion` (emitir y verificar contra la base) para que la semana 3 solo tenga que conectarla a WhatsApp.

## Fuera de alcance (no se construye ahora)

- WhatsApp, el asistente, el worker de Railway y los temporizadores en ejecución (semana 3).
- Pantallas de incidencias y Bandeja (semana 9).
- Red de profesionales, pagos y suscripción.
- El texto legal definitivo del DPA: se usa un borrador marcado como **PROVISIONAL — pendiente del abogado**, versionado. El despacho acepta una versión concreta (se guarda versión y hash).
- Borrado al terminar el contrato (US-015): se deja el diseño de tablas preparado y se construye con la suscripción.

## Anti-objetivos (sería un fracaso aunque funcione)

- Que un DNI, IBAN u observación del Excel llegue al servidor, a un log o a la base, aunque sea un instante.
- Que una consulta pueda devolver datos de otro despacho por olvidar un filtro.
- Que exista una sesión de personal sin 2FA confirmada.
- Que un estado de incidencia cambie sin evento, o que un evento se pueda modificar o borrar.
- Que un administrador quede bloqueado sin saber qué falta ni quién lo resuelve.

## Restricciones

- Invariantes de `CLAUDE.md` (1, 2, 3, 4, 8, 9).
- Fundador único y no técnico: pocas piezas, servicios gestionados y nada que haya que operar a mano.
- Desde el entorno de desarrollo no se alcanza Neon. Los tests usan un Postgres real en proceso (PGlite) para probar transacciones y RLS. La URL de Neon entra por variable de entorno cuando exista la cuenta.
- Accesibilidad WCAG 2.1 AA y texto base de 18 px (perfil de administradores mayores).
- Español de España en toda la interfaz; formatos de fecha y teléfono de España.

## Enfoques considerados

| Enfoque | Qué supone | Decisión |
|---|---|---|
| **A. Next.js + Better Auth (con plugin 2FA) + Drizzle + RLS en Postgres** | Librería mantenida para sesiones, TOTP y códigos de recuperación, integrada con Drizzle | **Elegido** (propuesto por Claude y aprobado por Arturo; Prisma sustituido por Drizzle, ver abajo): menos código propio en la parte más delicada |
| B. Next.js + autenticación propia (TOTP a mano) | Control total, pero hay que escribir y auditar sesiones, rotación y recuperación | Descartado: más riesgo y no aporta nada |
| C. Servicio externo (Clerk/Auth0) | Rápido, pero los datos del personal quedan en un tercero fuera de la UE y hay coste por usuario | Descartado por RGPD y coste |

ORM: **Drizzle** en lugar de Prisma (decisión de Claude tras la revisión). El CLI de Prisma 6 y 7 necesita descargar un motor binario desde binaries.prisma.sh, bloqueado en el entorno de desarrollo (403); sin él no se puede generar el cliente ni ejecutar un solo test contra la base. Drizzle es TypeScript puro: genera migraciones SQL sin binarios, funciona con PGlite en los tests y con Neon en producción, y Better Auth lo soporta. Comprobado el 17/11/2026 con una prueba de concepto: Drizzle + PGlite + RLS aísla dos despachos y rechaza escrituras cruzadas. El esquema de `prisma/schema.prisma` se traslada a `src/db/schema.ts` sin cambios de significado.

Aislamiento: **RLS + filtro en código** (elegido) frente a solo filtro en código, que se descarta porque un olvido expondría datos de otro despacho.

## Diseño

### Piezas

- **Un único proyecto** en la raíz, sin `apps/web`. El monolito modular sigue el diseño del consejo, sin monorepo. Next.js (App Router) vive en `app/`; la lógica de dominio sigue en `src/` y no conoce Next.
- **Capa de datos:** `src/db/` con el cliente Drizzle y una función `conDespacho(despachoId, fn)` que abre una transacción, hace `SET LOCAL app.despacho_id = …` y ejecuta `fn`. Todo acceso a datos de cartera pasa por ella. Las consultas sin despacho (inicio de sesión, alta) usan un rol separado y acotado.
- **RLS:** migración SQL con `ENABLE ROW LEVEL SECURITY` + `FORCE` y una política `despacho_id = current_setting('app.despacho_id')` en Comunidad, Vivienda, Contacto, Incidencia, IncidenciaEvento, Temporizador, OptIn, CodigoVerificacion y AuditLog. Para que la política sea simple se añade `despachoId` desnormalizado a las tablas que hoy solo cuelgan de la comunidad (decisión de Claude).
- **Solo inserción:** en IncidenciaEvento y AuditLog, un trigger que rechaza UPDATE y DELETE.
- **Cuentas:** Better Auth con su adaptador de Drizzle, mapeado al modelo `Usuario` existente (se añaden las tablas de sesión y cuenta que pida la librería). Contraseña + TOTP obligatorio. Sin TOTP confirmado, la sesión solo da acceso a la pantalla de configurar 2FA. Correo transaccional (código del DPA) por Resend; en tests, un transporte en memoria.
- **Importación:** componente de cliente con PapaParse para leer CSV y XLSX exportado a CSV. La lista blanca se aplica con `importarPadron()` en el navegador. Al servidor solo llegan las filas válidas ya filtradas, agrupadas por dirección, y el servidor vuelve a validar con la misma lista blanca (defensa en profundidad). Cada dirección distinta crea una Comunidad en PENDIENTE_AUTORIZACION con sus viviendas y contactos.
- **Código de comunidad:** `C-` + 4 dígitos, único y sin colisiones; se reintenta si choca.
- **QR:** página imprimible por comunidad (cartel y circular) con el QR generado en el servidor.

### Pantallas

1. Crear cuenta (nombre, correo, contraseña).
2. Configurar 2FA (QR de la app y códigos de recuperación).
3. Datos del despacho (nombre, CIF opcional).
4. Contrato de encargo: texto del DPA provisional, casilla y código de 6 cifras enviado al correo.
5. Importar: elegir archivo, ver "usaremos X de Y columnas; descartamos …" y "N filas en revisión", y confirmar.
6. Lista de comunidades con su estado y lo que falta a cada una.
7. Ficha de comunidad: completar datos, ver faltas y activar.
8. Cartel QR y circular imprimibles.

### Datos que se añaden al esquema

- `Despacho`: `dpaVersion`, `dpaHash`, `dpaAceptadoPorId`.
- `Comunidad`: `telefono24h`, `tieneAscensor`, `mantenedoraNombre`.
- `despachoId` en Vivienda, Contacto, IncidenciaEvento, Temporizador, OptIn y CodigoVerificacion.
- Tablas que pida Better Auth (sesión, cuenta, verificación, dos factores).

## Decisiones tomadas tras la revisión del constructor

Todas son decisiones de Claude, con su motivo. Arturo puede corregirlas.

1. **El padrón entra solo en comunidades autorizadas.** Un único archivo, en tres pasos:
   - **(a)** se crean las comunidades (solo la dirección) en PENDIENTE_AUTORIZACION;
   - **(b)** el administrador declara la autorización de subencargo, comunidad a comunidad o "todas las de la lista", y pasan a LISTA_IMPORTAR;
   - **(c)** el navegador envía vecinos y viviendas solo de las autorizadas.
   Motivo: no se tratan datos de vecinos sin la autorización del responsable (la comunidad). Pendiente de que el abogado confirme que basta la declaración del despacho.
2. **La autorización en v1 es solo DECLARACION_DESPACHO:** casilla con texto fijo, versión y fecha, más registro en auditoría, sin subir documentos. Así no hace falta almacenamiento de archivos ahora. FIRMA_PRESIDENTE (por correo con código) pasa a la semana 3.
3. **El registro es solo por invitación hasta el lanzamiento.** Arturo genera un enlace de invitación por despacho fundador. Motivo: nadie ajeno puede crear un despacho ni subir datos durante la beta.
4. **Un usuario ADMINISTRADOR por despacho en esta fase.** Invitar a PERSONAL_DESPACHO llega con la Bandeja (semana 9). El rol FUNDADOR no salta la RLS ni ve datos de los despachos: el soporte se da con el despacho delante. La cola de excepciones (US-014) se diseñará aparte, con su propia auditoría.
5. **Importación:**
   - Cada dirección normalizada es una comunidad; los portales se distinguen por la columna portal.
   - Volver a importar actualiza por (comunidad, teléfono) y por (portal, piso, puerta), y nunca borra.
   - Las filas en revisión se listan con su número para que el administrador corrija el Excel y lo vuelva a subir.
   - `distrito` se completa en la ficha: es obligatorio para activar, no para importar.
   - `numViviendas` se calcula a partir de las viviendas.
6. **2FA perdida:** primero, códigos de recuperación (10, de un solo uso). Si también se pierden, Arturo restablece la 2FA tras verificar al administrador por videollamada; queda en auditoría y se avisa por correo al titular. Es poco frecuente y no compensa automatizarlo.
7. **Presidente:**
   - `rol=presidente` en el Excel solo sugiere. La designación N2-P la confirma el despacho en la ficha (queda `designadoPorId`).
   - El correo del presidente de la ficha se rellena con el de ese contacto y se puede editar.
8. **Verificación en este entorno:** todos los tests de base de datos corren aquí, contra PGlite y con Drizzle. Lo único que se valida fuera es la conexión real a Neon.

9. **Uso de la vivienda y relación del contacto** (decidido con Arturo el 17/11/2026 a partir de tres casos: piso turístico, piso cerrado con propietario fuera y cambio de inquilinos).
   - `Vivienda.uso`: HABITUAL | TURISTICA | VACIA | DESCONOCIDO (por defecto DESCONOCIDO; lo completa el despacho en la ficha).
   - `Contacto.relacion`: PROPIETARIO | INQUILINO | GESTOR | CUSTODIO_LLAVES (independiente de `rol` VECINO/PRESIDENTE). En el Excel se acepta una columna `relacion` en la lista blanca.
   - `Contacto.verificadoPor` (DESPACHO | PROPIETARIO) y `verificadoEn`, para la revalidación anual de inquilinos.
   - `normalizarTelefono` acepta cualquier prefijo internacional escrito con `00` (p. ej. `001…` de EE. UU.), no solo `0034`.
   - Se construye ahora solo el dato. Los flujos van en la semana 3 con WhatsApp:
     - **Alta de inquilino confirmada por el propietario** con código. Al confirmarse, se da de baja al inquilino anterior de esa vivienda. Sin respuesta en 7 días, pasa a los pendientes del despacho.
     - **Revalidación anual** de inquilinos.
     - **Urgencia en vivienda VACIA:** aviso simultáneo al custodio de llaves y al propietario, más la cadena nocturna habitual.
     - **Vivienda TURISTICA:** los avisos de esa vivienda van también al GESTOR. Hay un límite de avisos por número desconocido, y un huésped nunca supera el nivel N0.

## Pruebas (puertas de esta fase)

- Tests de dominio existentes en verde (31).
- Tests contra PGlite:
  - RLS impide leer y escribir datos de otro despacho, también sin el filtro en código.
  - `transicionar()` deja estado y evento juntos o ninguno.
  - UPDATE/DELETE en eventos y auditoría se rechazan.
  - Importación de un CSV con DNI e IBAN: nada sensible persiste.
  - Una comunidad no se activa sin teléfono 24 h, mantenedora (si hay ascensor) y correo del presidente.
- Test de flujo: alta completa en los 5 pasos, con un usuario sin 2FA bloqueado.
- typecheck y build de Next en verde.

## Lo que queda a criterio del constructor

- Estructura interna de carpetas de `app/` y componentes de la interfaz.
- Librería de QR y forma exacta del cartel (siguiendo los textos de "Marca y mensajes").
- Si los XLSX se leen directamente o se pide exportar a CSV en v1 (preferible leerlos si la librería es ligera).
- Nombres de migraciones y de las funciones de la capa de datos.

## Pendiente de aprobación: simulación de situaciones (17/11/2026)

Cinco especialistas simularon 73 situaciones sobre este diseño. El resultado está en el documento "Chiscón — Simulación de situaciones y huecos" (https://claude.ai/artifact/21uFBn55p19VtyAcTzBPJD). Propone 7 grupos de cambios en el esquema que deben entrar en la primera migración:

1. Comunidad y encargo.
2. Historial sin datos personales.
3. Teléfono, conversación y modelo.
4. Personas y cargos.
5. Unidades.
6. Incidencias.
7. Dinero.

Propone además 8 decisiones de negocio. El plan por tareas no se escribe hasta que Arturo las apruebe.

## Decidido con Arturo: cobro de la comisión y presupuestos que crecen (17/11/2026)

El detalle completo está en el documento "Chiscón — Cómo, cuándo y a quién se cobra" (https://claude.ai/artifact/SLzeeJM4cKuQkWx5vYi71T).

**Cuándo se gana y se cobra la comisión**

- La comisión se gana y se cobra al firmar el presupuesto. Se descuenta del **monedero prepago** del profesional, con recarga automática por tarjeta guardada o Bizum.
- Los retrasos (repuestos, proveedores de materiales, tiempo) no la afectan.
- Solo se devuelve como saldo, nunca en dinero, si el trabajo se anula antes de empezar por una causa ajena al profesional.
- Sin saldo y con la recarga fallida, el profesional no puede aceptar trabajos nuevos.

**El pago de la reparación**

- Va directo de quien paga al profesional, como acuerden. Chiscón no interviene.
- El enlace de pago es opcional.

**Presupuestos que crecen**

- **Margen de imprevistos** aprobado al firmar (10 % por defecto, lo fija el despacho). Dentro del margen, el profesional solo avisa con foto.
- **Por encima del margen, ampliación:** una línea nueva firmada con código por WhatsApp. Se aplican los umbrales de presidente y de junta. Sin respuesta, recordatorio a las 24 h y después pasa al despacho.
- **Comisión sobre la ampliación:** se cobra al firmarla. La del margen usado, al cerrar el trabajo.
- **Límite de facturación:** el profesional no puede facturar más de lo firmado, más el margen y las ampliaciones.
- **Desviación media por profesional** visible para el administrador. Si es alta y se repite, el profesional queda en pausa automática.

**Pagos**

- Monedero: PAYCOMET (recomendado) o el TPV Redsys del banco de la empresa.
- Cuota del despacho: Stripe, con domiciliación SEPA.

**Esquema, grupo 7 (dinero)**

Tablas `Monedero` y `MovimientoMonedero` (recarga, comisión, devolución como saldo, cuota Pro; solo inserción). `Presupuesto` con `margenPct` y versiones o ampliaciones. `UsoMargen`. Desviación calculada por profesional.

La comisión ya no se calcula en la factura mensual por transferencia: queda sustituida por el monedero.

## Decidido con Arturo: paquete del despacho y puesta en marcha (17/11/2026)

- **Paquete cerrado.** Al firmar, el despacho contrata un paquete de N comunidades, con las viviendas declaradas de cada una. Eso fija un precio mensual por tramos.
- **30 días de puesta en marcha sin cuota.** Desde el día 31 se cobra el paquete completo, estén las comunidades activas o no. La activación es responsabilidad del despacho.
- **Compromiso de Chiscón:** dar el servicio completo a toda comunidad que cumpla las condiciones. El sistema pide los datos que faltan.
- **Ampliar el paquete:** en cualquier momento, con cobro desde el mes siguiente.
- **Reducir el paquete:** solo al renovar a los 12 meses. Excepción: si una comunidad cambia de administrador (con acta de la junta), sale del paquete el mes siguiente.
- **Esquema:** `Suscripcion` con `paqueteComunidades`, `firmadoEn`, `finPuestaEnMarcha` (firma + 30 días) y líneas por comunidad con `numViviendasDeclarado` y tramo. La factura mensual sale del paquete, no de las comunidades activas.
- **Sin mínimo ni máximo de comunidades por despacho** (decidido con Arturo el 17/11/2026). El paquete cerrado, el alta de 290 € y la cláusula de uso razonable ya cubren lo que el mínimo protegía.

## Decidido con Arturo: prioridad de los profesionales de confianza (17/11/2026)

- **Profesionales de confianza.** Hasta 3 por oficio, con orden 1.º, 2.º y 3.º. Se definen para todo el despacho o para una comunidad concreta; si hay las dos, manda la de la comunidad. Siempre van antes que la red y no pagan comisión.
- **Cascada automática.** Cada profesional tiene un tiempo para aceptar. Si no responde, el trabajo pasa al siguiente sin que nadie intervenga. Tiempos por defecto: U1 15 min · U2 2 h · U3 24 h.
- **La red.** Cuando no hay profesional de confianza, o ninguno acepta, el trabajo va a profesionales verificados cuya zona de trabajo cubre la comunidad. Se ordenan por cercanía, valoración, desviación de sus presupuestos y carga de trabajo (`capacidadSimultanea`). Estos trabajos pagan comisión.
- **Noche.** Primero los profesionales de confianza que tengan guardia. Si no hay, la guardia de la red. Después, el teléfono 24 h del seguro.
- **Esquema.** `ProveedorConfianza(despachoId, comunidadId?, oficio, orden 1..3, profesionalId)`, único por (ámbito, oficio, orden). Sustituye a la regla anterior de "uno por oficio". Zona de trabajo del profesional: distritos o radio. `Asignacion` registra el canal (CONFIANZA / RED) y el motivo por el que pasó al siguiente (NO_RESPONDE / RECHAZA / SIN_GUARDIA).

## Decidido con Arturo: programa Gente de Fiar (17/11/2026)

La evaluación completa está en el documento "Chiscón — Programa Gente de Fiar: evaluación" (https://claude.ai/artifact/QA3NYuAeF6a2sDdWQvd8PR).

- **Qué se paga.** El profesional paga por la oportunidad de participar en trabajos de otras comunidades y en concursos. No paga por un puesto en la lista: la comunidad ve a los candidatos ordenados por cercanía y valoración.
- **Quién puede entrar.** Cualquier profesional de la red que tenga las credenciales de su oficio, lo haya referido un despacho o no. Para que un profesional de confianza de un despacho pueda trabajar para otros despachos, ese despacho tiene que darle permiso expreso.
- **Niveles.** Portal (obras hasta 4.000 €, 29 €/mes, sustituye al Plan Pro), Barrio (de 4.000 a 40.000 €) y Villa (más de 40.000 €). Las cuotas de Barrio y Villa se fijan en las entrevistas. Si en un mes no llega ningún aviso, ese mes no se cobra. El saldo no caduca y no hay permanencia.
- **Cuándo empieza.** La inscripción se abre a la vez que el lanzamiento. Los concursos se abren por zona cuando haya demanda.
- **Comisión por tramos.** Sin nivel: 12 % hasta 3.000 €, 5 % de 3.000 a 20.000 € y 2 % por encima, con un máximo de 1.500 € por obra. Con nivel: 5 %, 3 % y 1 %, con un máximo de 1.000 €. En obra mayor se cobra por certificaciones.
- **Concursos.** Entre 2 y 4 ofertas, siempre con una de la red elegida por sorteo, y decide la junta. En obra mayor la ficha dice "documentación aportada", no "verificado".
- **Descuento de fundador** (−30 % durante 12 meses): solo si el despacho mete toda su cartera.
- **Cambios en el esquema:** `Profesional.nivel` y `credenciales` (con fecha de caducidad), `ProveedorConfianza.permiteOtrosDespachos`, `Concurso(incidenciaId, estado, maxOfertas)`, `OfertaConcurso`, `SuscripcionProfesional(nivel, mesesSinAvisos)`. La comisión se calcula con una función por tramos y su máximo.

## Decidido con Arturo: urgencias nocturnas (17/11/2026)

Detalle e investigación: "Chiscón — Urgencias nocturnas en Madrid: cómo funcionan hoy" (https://claude.ai/artifact/82U8GCfLn2QkxCJF764V7n). Arturo se reserva revisarlo más adelante.

**Cadena nocturna** (20:00–8:00 y festivos), en este orden:

1. Gas, fuego, humo o alguien atrapado: se muestra el texto del 112.
2. Personas atrapadas en el ascensor: aviso a la empresa mantenedora del ascensor.
3. Avería común cubierta por el seguro: se da el teléfono 24 h y el número de póliza. Si el seguro no llega en el plazo de la póliza, se pasa al paso 4.
4. Profesional de confianza que esté de guardia; si no hay, la guardia de la red. Ambos actúan con contención de importe máximo.
5. A las 9:00, resumen al despacho para el parte.

Respecto al diseño anterior, **el seguro pasa a ir antes que la red**.

**Contención con importe máximo.** Es una renuncia al presupuesto previo con tope, no un trabajo sin presupuesto (Decreto 35/1995). Topes, IVA incluido:

- Fontanería, electricidad y desatasco: 250 €.
- Cerrajería: 180 €.
- Ascensor con personas atrapadas: 0 €.
- Camión cuba: fuera del tope.

El profesional solo contiene el daño, no repara. La tarifa nocturna del profesional (desplazamiento único, precio por hora y recargo) se publica antes de salir.

**Autorización.** El despacho firma por cada comunidad una autorización permanente de contención (LPH art. 20.c). Cada vez que se usa, se avisa automáticamente al presidente y al despacho.

Pendiente del abogado: si la firma con código sirve como renuncia, y si las zonas comunes cuentan como domicilio a efectos del decreto.

**Esquema:**

- `PolizaComunidad`: aseguradora, número, teléfono 24 h, coberturas y plazo de llegada.
- `Comunidad`: mantenedor del ascensor y su teléfono 24 h.
- `TarifaNocturnaProfesional`: desplazamiento, precio por hora y recargo.
- `AutorizacionContencion`: comunidad, topes por oficio, firmada por, versión del texto y hash.
- `Incidencia.contencion`: importe máximo y si se ha usado.
