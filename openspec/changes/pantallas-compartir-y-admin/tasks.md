# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaCompartir`,
`PantallaPlanCompartido` y `PantallaAdmin`. Requiere revisión humana y `pantallas-catalogo-y-pieza`
archivado.

## 1. Enlaces (prueba primero)
- [x] 1.1 Enlace recién creado con campo para copiar y aviso de única vez; título limitado.
      Prueba: `tests/unit/tower-shares38.test.tsx`; el token no se persiste.
- [x] 1.2 Listado con estados y fechas, sin copiar ni recuperar anteriores.
      Prueba: reabrir la gestión sin botones de copia.
- [x] 1.3 Revocación ligada al enlace elegido; preparar otro invalida la confirmación anterior.
      Prueba: cambiar de enlace y Cancelar sin efectos.

## 2. Copia pública
- [x] 2.1 Título, aviso de solo lectura, etapas y resumen con reserva junto al estado.
      Prueba: veredicto histórico compatible no comunica compatibilidad completa.
- [x] 2.2 Enlace no disponible con acceso al inicio y sin sesión privada.
      Prueba: `tests/unit/share-server-boundary.test.ts`.

## 3. Administración
- [x] 3.1 Paneles de listado y editor con tokens; borrador y publicado distinguibles.
      Prueba: `tests/unit/route-test-admin.test.ts`; publicación explícita conservada.
- [x] 3.2 Sin métricas ni contadores sin datos. Prueba: ausencia de esos rótulos.

## 4. Verificación
- [ ] 4.1 `npm test`, `npm run typecheck`, `npm run lint`, y e2e `tower-shares38.spec.ts` y
      `tests/curation/curation.spec.ts`.
      (82 archivos / 736 pruebas; typecheck y lint limpios; `tower-shares38` 2 de 2. `curation` no se
      corrió: su config exige `UJ_TEST_EXTRACTION_LIVE=1` y credenciales admin que no están en este
      entorno; es una prueba en vivo con Groq y la habilita Brandon.)
- [x] 4.2 Capturas reales de gestión, copia pública y admin a 1440 y 390, sin desborde de página.
      (Desborde 0 px en las seis capturas. Sigue distinto: Compartir agrega aviso superior y nav con
      Asistente/cuenta, usa selector limitado con consentimiento en vez de campo libre y no muestra
      Copiar/Apagar por enlace (por diseño), y tiene una barra «Consultar lista sin emitir enlaces»
      que no está en la maqueta; PlanCompartido muestra una etapa por datos, sin «Ya la tiene»,
      «La que sigue» ni «El más bajo» porque la API pública no los manda. En Admin las métricas y
      «Cargar un precio» de la maqueta quedan para un cambio propio de Brandon: no se implementaron.)
- [x] 4.3 Revisor: fidelidad, tokens no expuestos y alcance.
      (Revisor independiente: sin hallazgos bloqueantes en esta capa.)
