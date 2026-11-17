# Propuesta a evaluar: programa por niveles para profesionales (17/11/2026)

## Contexto del negocio (decidido hasta hoy)

**Qué es Chiscón.** Plataforma de mantenimiento para comunidades de propietarios de Madrid. Lanzamiento completo previsto el 15/02/2027. Fundador único, no técnico, que construye con IA. Meta: **5.000 € netos al mes de media** (después de impuestos y gastos) en los 12 meses siguientes al primer cliente.

**Cómo funciona.**
- Entra a través de los administradores de fincas (despachos).
- Los vecinos avisan las averías por WhatsApp a un asistente de IA disponible 24 h.
- Los presupuestos se firman con un código.
- Hay una red de profesionales verificados.
- Principio rector: "cero laberintos". Todo es automático, con una sola decisión por pantalla.

**Ingresos decididos.**
1. **Despacho.**
   - Alta de 290 € (una vez).
   - Paquete cerrado de comunidades, con precio mensual por comunidad según su tamaño: 5,5 € hasta 15 viviendas; 6,5 € de 16 a 40; 9,5 € de 41 a 80; 14,5 € para más de 80. Más IVA.
   - Fundadores: 30 % de descuento durante 12 meses y precio fijo durante 24.
   - 30 días de puesta en marcha sin cuota. Desde el día 31 se cobra el paquete completo, estén las comunidades activas o no.
   - Contrato de 12 meses. Sin mínimo ni máximo de comunidades.
2. **Comisión del profesional de la red.**
   - 12 % del presupuesto firmado, sin IVA. Con el Plan Pro actual (29 €/mes) baja al 5 %.
   - Se gana y se cobra en el momento de la firma, descontada de un monedero prepago del profesional que se recarga automáticamente con tarjeta o Bizum.
   - Los retrasos no afectan. Solo se devuelve, como saldo, si el trabajo se anula antes de empezar por una causa ajena al profesional.
   - También paga comisión cada ampliación firmada y el margen de imprevistos que se use (10 % por defecto).
3. **Profesionales de confianza del despacho.**
   - Hasta 3 por oficio, en orden de prioridad, por despacho o por comunidad.
   - Siempre van antes que la red, con una cascada automática por tiempo de respuesta (U1 15 min, U2 2 h, U3 24 h).
   - **No pagan comisión.**
   - Consecuencia: la red recibirá muchos menos trabajos, y la comisión será un ingreso secundario.

**Mercado (estudios previos, Censo INE 2011, Madrid ciudad).**
- 90.768 edificios de pisos, con una media de unas 16,4 viviendas.
- Reparto por tramos: aproximadamente 56 % hasta 15 viviendas, 37 % de 16 a 40, 6 % de 41 a 80 y 1 % de más de 80.
- Precio medio por comunidad: unos 5,7 € (antes de la subida de 0,50 €).
- Un administrador lleva de media unas 50–57 comunidades. El ejemplo de Arturo es un despacho de 25 comunidades de 14 viviendas.
- Competencia en software para comunidades: VecinApp, Fynkus, FincasPlus, Comunicasa, Onzane, TucomunidApp, Fonio, entre otros. Competencia en reparaciones: Cronoshare, Habitissimo.

**Proyección anterior** (antes del cambio a profesionales de confianza):
- Unos 38–40 despachos en el mes 12, con 50 comunidades cada uno.
- Comisión supuesta de 1,5 € por comunidad y mes.
- Unos 4.950–5.300 € netos al mes de media.
- Gastos de infraestructura: Railway, Vercel, Neon, Resend, Cloudflare, WhatsApp Business API y modelo Claude clase Haiku.

## La propuesta de Arturo (a evaluar)

Los profesionales que entran en la plataforma porque los ha registrado un despacho o una comunidad como "de confianza" pueden apuntarse a un **programa de suscripción por niveles**. El programa les permite:

- **Aparecer en los primeros puestos** de las listas de presupuestos de **otras** comunidades, de otros despachos, en su zona.
- **Presentarse a concursos** de reparaciones grandes y remodelaciones que piden varios presupuestos (rehabilitación, fachadas, ascensores, cubiertas).

Habría **3 niveles según el rango de precio de los proyectos** a los que se puede ofertar. Cada empresa o profesional paga la cuota del nivel que quiera alcanzar.

## Ajustes que Claude propuso

1. **Pagar da visibilidad, nunca calidad.** Primero se aplican los filtros: verificación, valoración y desviación de presupuestos. Dentro de los que los pasan, se ordena por nivel.
2. **Etiqueta visible de "Destacado"** en las posiciones pagadas (Directiva Ómnibus y Reglamento P2B; pendiente del abogado).
3. **En los concursos decide siempre la comunidad o la junta.** El nivel solo da derecho a ofertar. Máximo de 3 a 5 ofertas por concurso.
4. **Comisión escalonada o con tope en obras grandes.** Un 12 % de 60.000 € es inaceptable.
5. **Los niveles sustituyen al Plan Pro.**
6. **En sus propias comunidades, los profesionales de confianza siguen siendo los primeros y no pagan.**

Propuesta de niveles: 1 Barrio (reparaciones y obras pequeñas), 2 Distrito (obras medianas, zona ampliada), 3 Obra mayor (rehabilitaciones, fachadas, ascensores). Los cortes de precio y las cuotas están sin fijar.
