# PRD: Plataforma de mantenimiento para comunidades de Madrid (v1, lanzamiento 15/2/2027)

## Resumen
Plataforma para despachos de administradores de fincas de Madrid ciudad. Registra cada avería de la comunidad, la asigna al proveedor de confianza del administrador o a una red verificada por oficio y distrito, exige presupuesto firmado antes de empezar, cobra con Stripe Connect sin custodiar fondos y responde el estado 24/7 por WhatsApp a vecinos, presidentes y administradores. Se lanza completa el 15/2/2027 con 5 despachos fundadores pagando.

## Objetivos
- Lanzamiento completo y funcional el 15/2/2027.
- 5 despachos fundadores facturando desde el mes 1; ≈38 despachos en el mes 12.
- Promedio ≈5.300 €/mes netos en los 12 meses desde el lanzamiento (Plan Despacho subido 0,50 €: tramos 5,5 / 6,5 / 9,5 / 14,5 €, media ≈6,2 €; 50 comunidades por despacho; comisión 1,5 €/comunidad/mes; supuestos a validar).
- Cero urgencias graves (U1) sin respuesta inmediata con el 112.

## Fuera de alcance (v1)
App nativa · integración con Fynkus/Gesfincas · isócronas · pago SEPA al proveedor de confianza por la plataforma · Plan Pro en el modelo base (se construye el cobro, no se cuenta como ingreso) · oficios regulados (electricidad, gas, climatización) en la red abierta · reseñas públicas · seguros · contabilidad de la comunidad.

## Puertas de calidad
- build, typecheck, lint y tests en verde en cada cambio.
- Evaluación del asistente: ≥150 casos; 100% en los 40 casos U1; ≥98% U1/U2; 20 casos de estado viejo; reloj congelado en CI.
- Beta cerrada: ≥3 ciclos completos (presupuesto firmado → trabajo → pago) en producción.
- Stripe Connect confirmado por escrito; entidad española/UE activa; dictamen del abogado.

## Historias de usuario

### US-001: Alta del despacho en menos de 30 minutos
Como administrador, quiero darme de alta, aceptar el contrato de encargo y subir mi Excel de comunidades para empezar el mismo día. **Agente:** Advocate/Guardian
- [ ] Cuenta con 2FA obligatoria
- [ ] El DPA se acepta con casilla + código y desbloquea "Importar"
- [ ] El CSV se analiza en el navegador; columnas fuera de la lista blanca se descartan sin subirse y se informa
- [ ] Cada comunidad pasa PENDIENTE_AUTORIZACION → LISTA_IMPORTAR → ACTIVA
- [ ] Una comunidad no se activa sin teléfono 24 h, mantenedora y correo del presidente
- [ ] Se generan cartel QR y circular por comunidad

### US-002: Identidad por niveles sin cuentas para vecinos y presidentes
**Agente:** Architect/Guardian
- [ ] N0 número desconocido: solo reporta y ve su reporte; nunca categorías de seguridad
- [ ] N1 teléfono del padrón con opt-in: estado del edificio y avisos
- [ ] N2 código de 6 cifras ligado al hash del documento (enlace 72 h, código 10 min, 3 intentos)
- [ ] N2-P presidente designado por el despacho para aprobar

### US-003: Registro de incidencias con estados y frescura
**Agente:** Architect
- [ ] Solo transicionar() cambia estados y escribe el evento en la misma transacción
- [ ] Orden: … Asignada → Aceptada → Pendiente de aprobación → … ; bloqueos por tercero aparte del estado
- [ ] Cada incidencia guarda última confirmación humana y temporizador por estado y urgencia
- [ ] Duplicados de zona común se agrupan sin revelar quién informó

### US-004: Asistente de WhatsApp
**Agente:** Oracle
- [ ] Primer mensaje: se presenta como IA del despacho, ofrece persona, enlaza privacidad
- [ ] Reglas U1 envían texto fijo con 112/distribuidora antes de llamar al modelo
- [ ] Urgencia final = máx(reglas, modelo); dudas U2/U3 → U2
- [ ] Respuestas de estado solo desde plantillas con frescura; nunca "alguien va en camino"
- [ ] Acepta notas de voz y fotos
- [ ] Rechaza temas fuera de incidencias de la comunidad

### US-005: Escalera nocturna y temporizadores
**Agente:** Oracle/Skeptic
- [ ] Franjas H/T/N con calendario de festivos de Madrid
- [ ] U2 nocturna: pregunta con botones → proveedor de guardia 15–30 min → teléfono 24 h del seguro → resumen a las 9:00
- [ ] Estado vencido → botones al profesional, máx. 1 cada 2 h; sin penalización automática
- [ ] El fundador no recibe escalados de incidencias

### US-006: Avisos con consentimiento
**Agente:** Guardian
- [ ] Opt-in solo por QR, circular o evidencia del despacho; registro con texto, fecha y canal
- [ ] Plantillas de utilidad solo a contactos con opt-in; BAJA en cada aviso
- [ ] Aviso art. 20 al presidente por WhatsApp o, sin opt-in, por correo

### US-007: Presupuesto firmado y aprobación por umbral
**Agente:** Architect/Guardian
- [ ] El profesional fija el precio; plantilla mínima de una línea + desplazamiento + IVA
- [ ] Firma con botón + código N2; registro de hash, versión, hora e identidad
- [ ] Por encima del umbral de la comunidad aprueba el presidente (N2-P)
- [ ] Imposible pasar a "En curso" sin presupuesto firmado y aprobación aplicable
- [ ] La renuncia al presupuesto solo se adjunta en papel

### US-008: Proveedor de confianza por WhatsApp
**Agente:** Advocate
- [ ] Recibe la avería con botones Aceptar / Llego a las… / En curso / Terminado
- [ ] Sube foto al terminar; el administrador puede actualizar en su nombre con registro
- [ ] Puede declarar turnos de guardia nocturna

### US-009: Red de profesionales por celdas
**Agente:** Architect/Strategist
- [ ] Alta con documentos (alta fiscal, RC) y videollamada; datos DAC7 desde el alta
- [ ] Celda oficio×distrito activa solo con ≥3 verificados; 3 gremios al inicio
- [ ] Si el de confianza no acepta en plazo, oferta paralela a 2–3 de la celda; el primero que acepta la obtiene
- [ ] El profesional rechaza sin penalización y fija su precio

### US-010: Reparaciones dentro de la vivienda (A2)
**Agente:** Advocate/Guardian
- [ ] El vecino acepta las condiciones de la plataforma como responsable antes de A2
- [ ] Presupuesto, firma N2, trabajo, pago y valoración interna
- [ ] Nunca se agrupan privativas entre viviendas

### US-011: Pagos con Stripe Connect
**Agente:** Architect
- [ ] Cuenta conectada por profesional con KYC; la plataforma no custodia fondos
- [ ] Comisión 12% (5% con Plan Pro) registrada por pago con su porcentaje
- [ ] Página de pago sin dirección ni descripción; factura al titular
- [ ] Pago al profesional tras conformidad del vecino

### US-012: Suscripción del despacho y facturación
**Agente:** Architect/Guardian
- [ ] Plan por tramos (5,5 / 6,5 / 9,5 / 14,5 €) calculado por comunidad activa; alta 290 €
- [ ] Descuento de fundador 30% durante 12 meses; garantía de 30 días desde la activación
- [ ] Facturas propias compatibles con Verifactu

### US-013: Bandeja e informe para la junta
**Agente:** Advocate
- [ ] Bandeja "necesita tu acción" con filtro bloqueado_por
- [ ] Contador mensual de consultas respondidas por el asistente
- [ ] Informe PDF por comunidad con incidencias, tiempos y fotos

### US-014: Cola de excepciones del fundador
**Agente:** Skeptic
- [ ] Alertas de salud del sistema (webhooks, validador) y excepciones diurnas
- [ ] Panel de puertas: ciclos completos, celdas activas, opt-in por comunidad

### US-015: Auditoría y protección de datos
**Agente:** Guardian
- [ ] Registro de quién aprueba, firma y accede; RLS por despacho
- [ ] prioridad_vulnerable sin datos de salud
- [ ] Borrado real al terminar el contrato, incluidas copias

### US-016: Evaluación del asistente
**Agente:** Oracle
- [ ] Batería de ≥150 casos ejecutada en CI en cada cambio de prompt o modelo
- [ ] Bloquea el despliegue si falla una U1

## Notas técnicas
Monolito modular: web Next.js en Vercel, worker en Railway (webhooks WhatsApp/Stripe, cola en Postgres, temporizadores, llamadas a Claude), Neon/Prisma con RLS por despacho, Resend, Cloudflare. Esquema según design.md.

## Dependencias externas
Entidad española/UE con NIF y cuenta · Meta Business verificado, número de WhatsApp y plantillas aprobadas · Stripe Connect para España confirmado por escrito · dictamen del abogado (7 preguntas) · gestor (forma jurídica, impuestos, Verifactu) · 5 cartas de fundador firmadas.
