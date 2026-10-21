# Etapa 25 — corrección y registro de hardware

Fecha: 2026-10-20. Alcance: documentación de proyecto; sin código de aplicación. Criterio: dejar selección/contrato trazables, corregir errores concretos y separar escenarios sustentados de abiertos sin inventar aceptación ni pruebas.

## Trabajo realizado

- Se confirmó la raíz del proyecto, se leyó AGENTS.md y se comprobó inexistencia de los cuatro documentos nuevos antes de crearlos. Se retomó la propuesta24; no se consultaron carpetas privadas/históricos externos. Ruta saneada en31c sin reejecutar esta etapa.
- Investigación pública dirigida: manuales ASRock B550 Pro4/B550M Pro4/B550M Steel Legend, fichas CX550/RM750e, manual RMe2025, FAQ ASUS adaptador, PRIME5070, ficha exacta Pop2 Black Solid, Meshify, CP14-E y guía de cable Corsair. No se repitió curación completa ni se refrescaron precios del24.
- PDFs ASRock y Fractal consultados en memoria con PowerShell/.NET (sin guardar PDFs/scripts). Se extrajo texto seleccionado, no se afirma revisión visual total. Meshify PDF no entregó texto utilizable; flujo binario/no textual de extracción Pop2 no se usó como evidencia. Especificaciones de las páginas Fractal se inspeccionaron también en HTML porque Markdown omitía tablas.
- ASRock HTML devolvió wrapper Incapsula pese a HTTP200; listas CPU directas sin contenido útil. Se conservó evidencia del índice oficial del24 distinguiéndola de revalidación. Noctua motherboard P03/P18 devolvió429; no se inventó compatibilidad obtenida.

## Correcciones registradas

1. P17 tiene un header USB3 frente a dos P03 y pierde USB traseros. No es positivo moviéndola a B. Manual no autoriza inferencia stock/OC sobre EPS4. Se propone P18 en B: dos headers, funciones traseras conservadas para CPUs sin iGPU, EPS4 expresamente opcional; P08 dispone segundo EPS. Persisten bloqueos de interferencias/carga/recorrido.
2. P15 incluye adaptador1→2. CX550 tiene **un ramal PCIe con dos puntas**, no dos cables independientes como exige ASUS. Ese es el fallo probado; no la ausencia de cable nativo. Sustitución de fuente incluye retirar cables anteriores.
3. Prioridad editorial propuesta para manual exacto RPS0215:62,5 A/750 W; conservar ficha54,2 A/750 W y conflicto de PCIe de repuesto.650,4 W no se convierte en especificación. Sin confirmación del fabricante.
4. Sumas314,32/474,32 W preservadas solo como borrador retirado; reservas/pérdidas/placa/RAM/reparto sin justificación excluidas. Recomendación750 W es umbral conservador propuesto, no consumo/arranque ni prueba suficiente de compatibilidad.
5. Ficha exacta Pop2:7 slots, L416/H175 mm GPU, cooler170 y PSU180 mm. Meshify7 slots/L315 con fans. Recuento nominal, largo y altura cooler se separan de envolvente GPU/cable e interferencias no comprobadas. No se usa cooler170 mm como ancho de GPU.
6. P14 documentado24×10×30 mm, pero encaje en instalación pendiente. B→Pop2+P14 pierde un USB-A/reset y cambia audio; S06 no queda falsamente aprobado. Revisiones no publicadas se registran “no diferenciada”, no bloqueo universal.
7. Pieza sola no agrega fuente; paquete y plan explícitos, con estados acumulados y costo propio. Precios del24 intactos; S16/S17 son ofertas del mismo hardware. Visuales separados de técnica, permiso pendiente, sin descargas.

## Archivos cambiados

- [../HARDWARE_DEMO.md](../HARDWARE_DEMO.md): selección/matriz, fuentes, asignaciones, conflictos, precios y referencias visuales.
- [../specs/CU05-compatibilidad.md](../specs/CU05-compatibilidad.md): contrato mínimo, reglas/política propuestas y S01–S18.
- [../../AGENTS.md](../../AGENTS.md): solo sección de enlaces/tres decisiones aceptadas y alcance fuente/dependencias; diez CU, seis módulos y estado de entorno conservados.
- [../CONTINUAR.md](../CONTINUAR.md): próximos faltantes concretos.
- Este registro.

## Verificación documental

- Relectura de los cinco archivos y comprobación local de enlaces relativos, IDs de piezas/fuentes/reglas/escenarios, modelos, unidades, coherencia de estados, conectores y operaciones monetarias. Comando PowerShell en memoria: 16 enlaces relativos sin destinos faltantes; 18 piezas, 25 fuentes, 10 reglas, 18 escenarios, 5 ofertas y 18 referencias visuales, sin IDs usados sin definición; 10 CU conservados. Alcance: texto/aritmética, no ejecución de motor ni prueba física.
- Mapa sin duplicaciones intencionales: A dos headers USB separados; B uno doble; P18 en B conserva mapa y añade EPS2 opcional. Cuatro fans en cuatro headers, M2_1/PCIE1/A2-B2 exclusivos. CX un ramal no se cuenta dos veces para adaptador.
- Sumas comprobadas:1.706.232+175.898=1.882.130;1.894.299+175.898=2.070.197;2×383.208,99=766.417,98. Márgenes117.870, exceso70.197 y margen RAM1.233.582,02. Diferencia329−315=14 mm y175−126=49 mm nominales, esta última no prueba el cable.
- La relectura corrigió S06 para no ocultar un fallo conocido entre faltantes: el candidato actual falla R10 de conservación funcional; lo abierto es encontrar la sustitución positiva. Decisiones nuevas siempre propuestas; tres aceptadas explícitas. No se registran tests aprobados, instalaciones, cambios de configuración/permisos/agentes, llamadas al revisor, Git ni implementación.

## Resultado y límites

Fundamentados documentalmente negativos cableado/dimensiones/soporte mínimo, dominancia y aritmética. Positivos de las seis categorías y bases siguen abiertos con faltante puntual por escenario; no se entrega selección cerrada ni plan operativo validado. Precisan demanda/reserva, envolventes y cooler/adaptador, evidencia de enlace aplicable y gabinete funcionalmente equivalente. No se contactó a fabricantes ni se tomaron mediciones físicas.

Hardware/política/contrato nuevos para revisión; no se decidió stack. Visuales y precios faltantes pueden avanzar con futura base técnica acordada, pero no justifican cerrar compatibilidad. Próximo paso acotado en CONTINUAR; no implementar por figurar como pendiente.
