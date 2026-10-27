# Probar UpgradeJusto local

Estado de procesos y URL: [CONTINUAR](CONTINUAR.md). **No asumir que localhost está
activo por una captura anterior.** Entorno de entrega: PostgreSQL TEST existente,
frontend producción y aplicación normal `upgradejusto.main:app`, sin factory/probes.
Google TEST ya fue confirmado por Brandon; no repetir ese paso ni modificar su cuenta.

## Recorrido

1. En **Tu cuenta**, usá tu acceso TEST existente. No compartas claves ni códigos.
2. **Ya tengo una PC:** elegí/revisá tu PC, objetivo y presupuesto; comprobá faltantes.
   Si no hay propuesta accionable, podés preparar un plan manual con piezas reales.
   Sin precios vigentes el coste queda desconocido, no cero ni dentro de presupuesto.
3. **Quiero armar una desde cero:** empieza vacío. Elegí piezas y cantidades; el
   subtotal sólo cubre compras elegidas. Guardar requiere confirmación y no declara
   que ya poseés esas piezas. Comprobar y guardar plan son acciones separadas.
4. Abrí el plan, compará antes/después, etapas y precios guardados. El historial no
   actualiza precios ni aplica cambios a tu PC. Compartir/revocar requiere otra acción.
5. En catálogo revisá variante, fuente, ARS, contado/lista y fechas. Las ofertas
   existentes vencieron realmente; no se alteraron fechas ni reloj para hacerlas pasar.

Administración requiere rol del servidor. Las pruebas sintéticas no otorgan rol a tu
cuenta. No borrar/migrar DEV ni resetear cuentas para probar.

## Evidencia y límites

- Central1440/390: plan manual real, coste desconocido, dos etapas, guardado explícito,
  reapertura/historial y PC inmutable comprobados. No acredita una recomendación con
  precios actuales ni un escaneo exhaustivo de todo el catálogo.
- Desde cero1440/390: compras reales, cantidades, subtotal parcial, confirmación,
  evaluación y plan. Catálogo real y fotos/ofertas: gate aprobado.
- CU09 normal PG/HTTP y navegador: publicación, lectura anónima congelada, aislamiento
  de otro propietario, revocación y nuevo consentimiento al cambiar de plan aprobados.
- **Chat bloqueado:** Ollama instalado y transporte reparado; turno real sin get_pc
  ni evaluate_pc. [Evidencia y límites](IA_LOCAL38.md). No repetir llamadas automáticamente.
- Visual: revisión literal cerró los dos P2 de densidad en PC y etapas escritorio tras
  corregirlos. Etapas móvil fuera del encuadre y compartido visual pendientes. No es
  aceptación humana/global; las aprobaciones anteriores no aceptan esta versión.
- CU02/CU10 conservan evidencia funcional anterior; no se repitieron extracción LLM ni
  administración mutante en este bloque. T10/certificación física completa pendientes.

No declarar diez CU integralmente cerrados ni confundir HTTP200 con operación completa.

## Arranque y parada reproducibles

Con dependencias/build ya comprobados y PG TEST disponible, desde la raíz:

```powershell
.\scripts\local-preview38.ps1 -Action Start -SystemTrust -ChatProvider ollama -OllamaModel qwen3:4b
```

El script no instala ni migra; rechaza puertos ocupados. Arranca sólo loopback3000/8000,
elimina variables de inyección de fallos y devuelve su nuevo manifiesto ignorado.
`SystemTrust` usa TLS del sistema en esos procesos, no desactiva validación TLS.
El proveedor efectivo queda en el manifiesto; CU02 sigue usando Groq.
No ejecutar runners simultáneamente con ese stack.

```powershell
.\scripts\local-preview38.ps1 -Action Stop -ManifestPath '<manifiesto devuelto al arrancar>'
```

Stop valida identidad de sus procesos y no toca PG/datos ni el listener Ollama propio.
No reutilizar PIDs/manifiestos históricos. Sin push/deploy ni exposición pública.
