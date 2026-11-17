# Chiscón — reglas de desarrollo y seguridad

Plataforma de mantenimiento para comunidades de propietarios de Madrid (entrada por administradores de fincas, asistente de WhatsApp 24/7, red de profesionales, presupuesto firmado, pagos). Lanzamiento completo: **15/02/2027**. Fundador único, no técnico: responder en español, una recomendación directa, bloqueos primero.

## Principio rector: cero laberintos

El sistema trabaja solo y se sincroniza solo. Nadie (vecino, presidente, administrador, profesional) debe perderse entre opciones o decisiones.

- **Lo automático primero.** Si el sistema puede deducir o decidir algo, lo hace y lo explica en una línea; la persona solo corrige si quiere.
- **Una decisión por pantalla o mensaje** como máximo, con la opción recomendada ya marcada.
- **Nada de configuración previa.** Valores por defecto sensatos; los ajustes aparecen solo cuando hacen falta.
- **Cada aviso dice qué pasa y qué hacer**, con un solo botón o respuesta.
- **Tono con inteligencia emocional:** calma ante la urgencia, sin culpas, sin tecnicismos, pensando en personas mayores y en gente con prisa o enfadada.
- **Cobros invisibles:** nadie factura ni persigue pagos a mano.

Cada pantalla, mensaje o ventana de interacción se diseña antes de programarla:

1. Con el agente `agentic-council:Advocate`, que simula a las personas reales: vecina de 82 años, administrador de 60 años, profesional con las manos ocupadas, vecino enfadado.
2. Con las skills `agentic-council:advocate-journey-mapping`, `agentic-council:advocate-interaction-design`, `design:ux-copy` y `agentic-council:advocate-a11y-audit`.
3. Se revisa contra este principio. Si una pantalla pide más de una decisión, se rediseña.

## Skills obligatorias por etapa

Antes de cada tarea, cargar con la herramienta Skill las que apliquen. No es opcional.

| Etapa | Skills |
|---|---|
| Antes de construir algo nuevo | `superpowers:brainstorming` → `superpowers:writing-plans` |
| Modelo de datos y migraciones | `agentic-council:architect-schema-design`, `agentic-council:guardian-data-classification` |
| Endpoints y webhooks (WhatsApp, Stripe) | `agentic-council:architect-api-design`, `agentic-council:skeptic-threat-model` |
| Escribir código | `superpowers:test-driven-development` (test primero, siempre) |
| Bugs o tests que fallan | `superpowers:systematic-debugging` |
| Datos personales, consentimiento, RGPD | `agentic-council:guardian-compliance-review`, `agentic-council:guardian-audit-trail-design` |
| Códigos OTP, HMAC, tokens, cifrado | `agentic-council:cipher-crypto-review` |
| Casos límite de estados e incidencias | `agentic-council:skeptic-edge-case-enumeration`, `agentic-council:skeptic-failure-mode-analysis` |
| Asistente (Claude) | `agentic-council:oracle-prompt-engineering`, `agentic-council:oracle-ai-evaluation` |
| Pantallas, mensajes y textos | Agente `agentic-council:Advocate` + `agentic-council:advocate-journey-mapping`, `agentic-council:advocate-interaction-design`, `design:ux-copy`, `agentic-council:advocate-a11y-audit` |
| Plan de tests y E2E | `agentic-council:craftsman-testing-strategy`, `agentic-council:craftsman-e2e-testing` |
| Revisión antes de cada commit/PR | `engineering:code-review`, `superpowers:requesting-code-review` |
| Antes de decir "terminado" | `superpowers:verification-before-completion` (ejecutar tests y typecheck, mostrar la salida) |
| Despliegue y monitorización | `agentic-council:operator-deployment-plan`, `agentic-council:operator-observability-design`, `engineering:deploy-checklist` |

## Invariantes de seguridad (nunca se rompen)

1. **Sin DNI, IBAN ni observaciones** del padrón: la importación CSV usa lista blanca de columnas; filas con DNI/IBAN van a revisión.
2. **Historial inmutable**: `IncidenciaEvento` y `AuditLog` solo admiten inserción. Todo cambio de estado pasa por `transicionar()` dentro de una transacción.
3. **Aislamiento por despacho**: toda consulta filtra por despacho (RLS en Postgres). Ningún endpoint devuelve datos de otro despacho.
4. **Identidad por niveles** (N0/N1/N2/N2P): aprobar presupuestos exige código de 6 cifras ligado al hash del documento, 10 min, 3 intentos.
5. **Urgencias**: gas, fuego, humo o persona atrapada → texto del 112 antes de cualquier llamada al modelo. El fundador nunca está en la cadena nocturna.
6. **El asistente se identifica como automático** (AI Act art. 50) y solo informa del estado registrado, nunca lo inventa.
7. **Sin custodia de dinero**: Stripe Connect con cobro directo al profesional.
8. **Opt-in solo por QR del portal o circular**. Nada de mensajes en frío.
9. **Secretos** solo en variables de entorno; nunca en el repo, en logs ni en prompts.
10. Webhooks: verificar firma (Meta, Stripe) e idempotencia antes de procesar.

## Comandos

- `npm test` — vitest
- `npm run typecheck` — tsc
- `npx prisma validate` — validar esquema (en este entorno el motor de Prisma está bloqueado; validar en local)

## Stack

Railway (worker), Vercel (Next.js), Neon + Prisma, Resend, Cloudflare (DNS de chiscon.es), Stripe Connect, WhatsApp Business API, Claude (clase Haiku).

Diseño, PRD y plan de referencia: `docs/consejo/design.md`, `docs/consejo/prd.md`, `docs/consejo/plan.md`.
