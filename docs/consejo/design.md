# Documento de diseño: Plataforma de mantenimiento para comunidades de Madrid — organización funcional y estructura

## Resumen
Monolito modular (web en Vercel + worker en Railway, una base Neon/Prisma) con el asistente de WhatsApp como capa fina sobre una máquina de estados. Lanzamiento con el producto completo el 15/2/2027 (decisión del usuario), tras una beta cerrada sin cobro de dos semanas; la red se activa por celdas oficio×distrito con ≥3 profesionales verificados. Proyección honesta del consejo: ≈4.950 €/mes netos de media en 12 meses con 50 comunidades por despacho; la meta de 5.000 € queda en riesgo.

## Fases y orden de construcción (revisado: lanzamiento completo el 15/2/2027, decisión del usuario)
| Semanas | Fechas | Producto | Trámites y ventas |
|---|---|---|---|
| 1–2 | 17–30 nov 2026 | Núcleo: identidad por niveles, alta con DPA, CSV depurado, incidencias con eventos | Gestor (entidad y NIF), abogado (7 preguntas), Meta Business y número de WhatsApp, Stripe; 10 entrevistas a administradores |
| 3–5 | 1–21 dic | Asistente WhatsApp (reglas U1, escalera nocturna, frescura), avisos con opt-in, presupuesto con OTP, parte de trabajo; 150 casos de evaluación | Constitución/alta; plantillas de WhatsApp aprobadas |
| 6–8 | 22 dic – 11 ene 2027 | Red: alta y verificación, celdas oficio×distrito, ofertas paralelas, recorrido privativo | Mudanza a Madrid; captación de profesionales en 3 gremios y distritos de los fundadores |
| 9–10 | 12–25 ene | Pagos: Stripe Connect sin custodia, suscripción del despacho, facturación compatible con Verifactu, datos DAC7 | Confirmación escrita de Stripe; firma de 5 cartas de fundador |
| 11–12 | 26 ene – 8 feb | Beta cerrada sin cobro con 1–2 fundadores en 3–5 comunidades; ≥3 ciclos completos en producción | Teléfono 24 h, CSV y QR de las comunidades fundadoras |
| 13 | 9–14 feb | Congelación, puertas de evaluación del asistente, corrección | Avisos de activación |
| Lanzamiento | 15 feb 2027 | Producto completo; red activa en las celdas con ≥3 verificados | Mes 1: 5 fundadores facturando |

Sin piloto gratis de dos meses ni cláusula de escape: los fundadores pagan desde el 15/2/2027 (30% de descuento, señal de 290 €). Si una puerta no se supera, se lanza con menos celdas activas, no con menos funciones.

## Arquitectura
Módulos: plataforma (cola en Postgres, webhooks, auditoría) · identidad (2FA personal; N0/N1/N2/N2-P) · cartera (alta, DPA, CSV con lista blanca, estados PENDIENTE_AUTORIZACION→LISTA_IMPORTAR→ACTIVA) · incidencias (IncidenciaEvento solo inserción, transicionar() única vía, bloqueos por tercero, frescura, temporizadores) · asistente · notificaciones (opt-in, correo al presidente) · presupuestos (OTP ligado al hash del PDF) · trabajos · red (CeldaRed oficio×distrito) · asignación · pagos (Connect) · valoraciones · facturación.
Orden de estados: Pendiente de aprobación va después de Aceptada (el umbral necesita el importe del presupuesto). Para pasar a "En curso": presupuesto mínimo firmado con OTP N2 + aprobación según umbral.
Esquema añadido: OptIn, CodigoVerificacion, PolizaComunidad, ComunidadTercero, GuardiaProveedor, Temporizador, ParametroTemporizador, CeldaRed, ContratoFundador; Incidencia con urgenciaReglas/urgenciaLLM/urgenciaFinal, categoriaSeguridad, prioridadVulnerable, ultimaConfirmacionHumana.

## Asistente
Reglas deciden, el modelo clasifica y redacta (clase Haiku detrás de una interfaz intercambiable). U1 → texto fijo con 112/distribuidora antes del modelo. Urgencia final = máx(reglas, modelo). Escalera nocturna: proveedor de guardia (15–30 min) → teléfono 24 h del seguro con póliza → resumen a las 9:00. Nunca "alguien va en camino". Cada respuesta: estado, desde cuándo, última confirmación humana, tercero que bloquea. Estado vencido → botones al profesional (máx. 1 cada 2 h). Opt-in solo por QR/circular/evidencia del despacho; nunca mensajes en frío. Se presenta como IA. Puertas: ≥150 casos, 100% U1, ≥98% U1/U2, 20 casos de estado viejo; antes del cobro, 0 U1 omitidas en piloto y revisión de 50 conversaciones reales.

## Experiencia por rol
Vecino y presidente sin cuenta; una pregunta por mensaje; WCAG 2.1 AA, 18 px, notas de voz, firma sin trazo. Administrador: alta en 5 pasos, Bandeja "necesita tu acción", informe para la junta. Proveedor de confianza: botones de WhatsApp y puerta dura antes de "En curso". Profesional de red: solo en celdas activas. Fundador: cola de excepciones en horario diurno, fuera de cadenas nocturnas.

## Cumplimiento
Antes del piloto: DPA dentro del alta, autorización de subencargo por comunidad, CSV depurado, registro de actividades, plantillas de utilidad con opt-in, auditoría, 2FA, carta de fundador. Antes del cobro: entidad española/UE, Stripe Connect confirmado por escrito, KYC de profesionales, facturación compatible con Verifactu, datos DAC7. Renuncia al presupuesto solo en papel. Nunca se revela quién informó. Sin datos de salud.

## Modelo comercial
Carta de fundador (ene–feb 2027): 30% de descuento 12 meses, señal 290 €, facturación al activarse el flujo completo o el 1/6/2027, mínimo 40 comunidades facturables (o toda la cartera), CSV completo con teléfono 24 h y mantenedora, QR en ≥80% en 30 días, un proveedor de confianza por gremio. Supuestos: 5 fundadores + 3 despachos/mes (38 en mes 12), media 50 comunidades activas, 5,7 €/comunidad, comisión 1,5 €/comunidad/mes (supuesto más débil), Plan Pro fuera del modelo base → ≈85.900 € antes de impuestos ≈ 4.950 €/mes netos de media.

## Riesgos principales
1 fuga o gas de noche sin respuesta · 2 meta de ingresos · 3 fundadores que no firman · 4 saturación del fundador · 5 Stripe Connect y saldos negativos · 6 puerta de cobro tarde · 7 celdas vacías · 8 exposición legal. Cada uno con señal y criterio de corte (ver round3).

## Resoluciones de tensiones
| Tensión | Agentes | Resolución | Motivo |
|---|---|---|---|
| Cobrar antes vs flujo completo | Estratega / Escéptico | Flujo completo antes de cobrar (decisión del usuario) + carta de fundador con señal, puerta de 3 ciclos y escape el 1/6/2027 | Respeta al usuario sin anclar el precio en 0 € |
| Comunidades sin teléfono 24 h | Escéptico + Arquitecto / Oráculo + Guardián + Defensor | No se activan; el teléfono 24 h (póliza, mantenedora o guardia) es requisito del alta | Una fuga nocturna sin respuesta es el riesgo más grave |
| Fricción vs identidad | Defensor / Guardián | Sin cuentas, pero niveles N0–N2-P con código por acción | Seguridad proporcional al riesgo de cada acción |
| Piloto con todo vs solo zonas comunes | Usuario / Guardián + Defensor | Piloto gratis A1; flujo completo por celdas antes del cobro | Reduce riesgo legal y de pagos sin retrasar el cobro |
| Estado falso | Oráculo / Escéptico | Frescura obligatoria + temporizadores + botones al profesional | El estado viejo es más probable que la alucinación |

## Registro de decisiones
| Decisión | Opciones | Elegida | Motivo |
|---|---|---|---|
| Arquitectura | Microservicios / monolito modular | Monolito modular, 2 despliegues | Fundador solo |
| Cola de trabajos | Redis / Postgres | Postgres | Menos piezas |
| Red al inicio | Toda la ciudad / por celdas | Celdas con ≥3 verificados, 3 gremios | Ofertas que se cumplen |
| Pago al proveedor de confianza | Plataforma / fuera | Fuera en v1 | Sin custodia ni coste de tarjeta |
| Modelo de IA | Grande / pequeño | Clase Haiku intercambiable | Coste y latencia |
| Plan Pro | En modelo base / fuera | Fuera del modelo base | Supuesto sin validar |
