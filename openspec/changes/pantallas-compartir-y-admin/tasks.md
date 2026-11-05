# Tasks

Agente `frontend`, salvo la revisión. Leer `README.md` y `preview.html` de `PantallaCompartir`,
`PantallaPlanCompartido` y `PantallaAdmin`. Requiere revisión humana y `pantallas-catalogo-y-pieza`
archivado.

## 1. Enlaces (prueba primero)
- [ ] 1.1 Enlace recién creado con campo para copiar y aviso de única vez; título limitado.
      Prueba: `tests/unit/tower-shares38.test.tsx`; el token no se persiste.
- [ ] 1.2 Listado con estados y fechas, sin copiar ni recuperar anteriores.
      Prueba: reabrir la gestión sin botones de copia.
- [ ] 1.3 Revocación ligada al enlace elegido; preparar otro invalida la confirmación anterior.
      Prueba: cambiar de enlace y Cancelar sin efectos.

## 2. Copia pública
- [ ] 2.1 Título, aviso de solo lectura, etapas y resumen con reserva junto al estado.
      Prueba: veredicto histórico compatible no comunica compatibilidad completa.
- [ ] 2.2 Enlace no disponible con acceso al inicio y sin sesión privada.
      Prueba: `tests/unit/share-server-boundary.test.ts`.

## 3. Administración
- [ ] 3.1 Paneles de listado y editor con tokens; borrador y publicado distinguibles.
      Prueba: `tests/unit/route-test-admin.test.ts`; publicación explícita conservada.
- [ ] 3.2 Sin métricas ni contadores sin datos. Prueba: ausencia de esos rótulos.

## 4. Verificación
- [ ] 4.1 `npm test`, `npm run typecheck`, `npm run lint`, y e2e `tower-shares38.spec.ts` y
      `tests/curation/curation.spec.ts`.
- [ ] 4.2 Capturas reales de gestión, copia pública y admin a 1440 y 390, sin desborde de página.
- [ ] 4.3 Revisor: fidelidad, tokens no expuestos y alcance.
