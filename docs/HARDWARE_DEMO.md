# Hardware real de referencia — etapa 25

Fecha: 2026-10-20. Revisión documental propuesta: `hardware-demo-25.1`.

Selección para revisión, no compra recomendada, equipo físico medido ni catálogo implementado. Se conservan los diez CU y seis módulos de [AGENTS.md](../AGENTS.md). Contrato y escenarios: [CU05](specs/CU05-compatibilidad.md). Investigación y límites: [registro](ai-log/2026-10-20-etapa25-curacion-hardware.md).

Estados de evidencia: **D** documentado; **C** declarado para el escenario; **E** estimado; **X** conflictivo; **P** pendiente. D no significa prueba física. Fecha de consulta de las fuentes técnicas: 2026-10-20; se distingue evidencia del 24 conservada de reconsulta del 25. Los IDs son locales al registro y se conservan aunque se descarte un candidato.

## 1. Piezas y configuraciones

| ID | Modelo/variante exacta | Uso y motivo |
|---|---|---|
| P01 | AMD Ryzen 5 5600 `100-100000927BOX` | CPU A, AM4 6 núcleos/12 hilos |
| P02 | AMD Ryzen 7 5700X `100-100000926WOF` | CPU B y sustitución A; 8/16 para trabajo paralelo, sin promesa universal de rendimiento |
| P03 | ASRock B550M Pro4 original, no Pro SE | Placa compartida |
| P04 | Kingston `KVR32N22S8/8` | Dos módulos individuales de 8 GB en A |
| P05 | Kingston `KVR32N22D8/16` | Dos módulos individuales de 16 GB en B y alternativa A; no kit comercial inventado |
| P06 | ASUS `DUAL-RTX4060-O8G-EVO`, negra OC | GPU compartida, 8 GB |
| P07 | Corsair CX550 2023 `CP-9020277`, modelo eléctrico `RPS0127` | Fuente A; no CX550M ni generación anterior |
| P08 | Corsair RM750e 2025 `CP-9020295-AR`, `RPS0215` | Fuente B y alternativa A; no RM750e 2023 |
| P09 | Fractal Pop 2 Air Black Solid `FD-C-POA2A-01` | Gabinete A y alternativa B; no variante TG/RGB |
| P10 | Fractal Meshify C Black Solid `FD-CA-MESH-C-BKO` | Gabinete B; no Mini/TG |
| P11 | Samsung 970 EVO Plus 500 GB `MZ-V7S500BW` | SSD compartido |
| P12 | Noctua NH-U12S redux con montaje AM4 | Cooler compartido; incluye un P13 |
| P13 | Noctua NF-P12 redux-1700 PWM | Tres adicionales de gabinete; cuatro en total contando el del cooler |
| P14 | SilverStone `SST-CP14-E` | Adaptador del USB-C de A |
| P15 | ASUS `PRIME-RTX5070-O12G` | GPU alternativa 12 GB; objetivo verificable de capacidad VRAM 8→12 GB, sin FPS prometidos |
| P16 | ASUS `TUF-RTX5070-O12G-GAMING` | Negativo dimensional real en B |
| P17 | ASRock B550 Pro4 | Candidato del 24 retirado del positivo; se conserva su evidencia |
| P18 | ASRock B550M Steel Legend original | Nuevo candidato propuesto de motherboard, evaluado en B |

Revisiones de PCB/SSD no diferenciadas por el fabricante en la evidencia utilizada: registrar así, no inventar revisión. Solo generan faltante si una diferencia relevante afecta una regla. El sufijo regional AR de P08 identifica la oferta; la documentación técnica CP-9020295/RPS0215 se vincula a la plataforma eléctrica, sin asumir idéntico cable de red regional.

| Base documental | CPU | Placa | Conjunto RAM | GPU | Fuente | Gabinete | Dependencia frontal |
|---|---|---|---|---|---|---|---|
| A | P01 | P03 | 2×P04 = 16 GB | P06 | P07 | P09 | P14 |
| B | P02 | P03 | 2×P05 = 32 GB | P06 | P08 | P10 | Ninguna |

Ambas incluyen P11, P12 y tres P13 adicionales. Son propuestas de bases **aún abiertas**, no dos positivos certificados.

### Condiciones C de instalación (no observaciones)

- BIOS de P03: P2.30; RAM A2/B2, JEDEC DDR4-3200, sin XMP. CPU a stock, sin OC manual/PBO; no alterar límites de potencia de GPU.
- P11 en M2_1; M2_2 y SATA vacíos. Sin HDD, ópticas, radiadores, bombas, iluminación, otras tarjetas, riser ni cargas USB externas adicionales. Un USB de alta demanda añadido requiere reevaluar.
- GPU horizontal en PCIE1. Slots inferiores sin otras tarjetas. No se declara por ello comprobada toda interferencia con shroud/headers/cables.
- Retirar ventiladores originales del gabinete. Dos P13 delanteros de entrada y uno trasero de salida; cuarto P13 en P12. Sin splitters ni hubs. Cables fuera de ventiladores/volumen GPU y sin presión lateral: condición requerida cuya viabilidad geométrica sigue por justificar.
- P12 con kit AM4 correspondiente, pasta térmica y montaje del manual. Al desmontar CPU/placa, renovar pasta; consumible sin cotización todavía.
- Ambiente propuesto 20–25 °C, entrada de aire de P07 ≤30 °C; no medido. Red y cable de alimentación adecuados al país, dentro del rango de la fuente. Uso del juego de cables compatible de cada fuente.
- En P09 se utilizan USB-A, USB-C a 5 Gb/s, audio combinado y encendido. En P10, dos USB-A, audio/mic separados, encendido y reset. No tratar ambos frontales como funcionalmente idénticos.
- Cambio de placa B→P18: BIOS P2.30 declarada para el candidato; no se hereda la BIOS de la placa retirada ni se presume un servicio de actualización incluido.

## 2. Fuentes técnicas

Las secciones/páginas corresponden a la paginación impresa, no al índice del visor PDF. Los manuales se consultaron en memoria; extracción textual parcial no equivale a revisión visual de todos los dibujos.

| ID | URL y localizador | Consulta/evidencia |
|---|---|---|
| F01 | [AMD 5600](https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html), Specifications | 24 conservada |
| F02 | [AMD 5700X](https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-7-5700x.html), Specifications | 24 conservada |
| F03 | [B550M Pro4](https://www.asrock.com/mb/AMD/B550M%20Pro4/index.us.asp), Specifications; [manual](https://download.asrock.com/Manual/B550M%20Pro4.pdf), pp. 2–9, 21–24, 27–31, M.2 | 24 ficha; 25 manual. HTML posteriormente bloqueado por Incapsula, no evidencia de desaparición del producto |
| F04 | Lista CPU [5600](https://www.asrock.com/support/cpu.asp?s=AM4&u=695) y [5700X](https://www.asrock.com/support/cpu.us.asp?s=AM4&u=694), filas por motherboard | Índice oficial recuperado en 24: P03 P2.30; P17 P2.20; para 5700X también P18 P2.30. Reconsulta directa 25 sin texto útil; no fingir nueva validación del HTML |
| F05 | Kingston [tabla de referencias](https://www.kingston.com/en/memory/client/ddr4-3200mts-non_ecc-unbuffered-dimm), filas exactas; fichas [P04](https://www.kingston.com/datasheets/KVR32N22S8_8.pdf) y [P05](https://www.kingston.com/datasheets/KVR32N22D8_16.pdf) | 24 tabla/índice; herramienta web no interpretó PDFs, no atribuir lectura íntegra |
| F06 | ASUS [P06](https://www.asus.com/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g-evo/techspec/), Tech Specs | 24 conservada |
| F07 | ASUS [P15](https://www.asus.com/us/motherboards-components/graphics-cards/prime/prime-rtx5070-o12g/techspec/), Dimensions, PSU, Accessories | 25 reconsulta |
| F08 | ASUS [P16](https://www.asus.com/us/motherboards-components/graphics-cards/tuf-gaming/tuf-rtx5070-o12g-gaming/techspec/), Dimensions/Slot | 24 conservada |
| F09 | Corsair [CX550 CP-9020277](https://www.corsair.com/us/en/p/psu/cp-9020277-na/cx-series-cx550-550-watt-80-plus-bronze-atx-power-supply-cp-9020277-na), Power Table, Cable Table, Tech Specs | 25 reconsulta |
| F10 | Corsair [manual RMe 2025](https://www.corsair.com/us/en/explorer/diy-builder/power-supply-units/corsair-rme-series-2025/), RM750e Specifications/Included Cables | 25 reconsulta, documento técnico del modelo RPS0215 |
| F11 | Corsair [ficha RM750e CP-9020295](https://www.corsair.com/us/en/p/psu/cp-9020295-na/rme-series-rm750e-fully-modular-low-noise-atx-power-supply-cp-9020295-na), Power/Cable Table | 25 reconsulta; conflicto con F10 conservado |
| F12 | Fractal [Pop 2 Air Black Solid](https://www.fractal-design.com/products/cases/pop-series/pop-2-air/pop-2-air-black-solid/), Specifications; [manual](https://assets.fractal-design.com/files/uxzbxy2o/production/fa7709006c1bf7d321ee568b526a6ad08f7b48fb.pdf), pp. 3–4, 29–30 | 25 ficha exacta y especificaciones HTML; PDF, texto seleccionado |
| F13 | Fractal [Meshify C](https://www.fractal-design.com/products/cases/meshify-series/meshify-c/meshify-c/), Specifications; [FAQ GPU/radiador](https://support.fractal-design.com/support/solutions/articles/4000119088-will-my-graphics-card-fit-in-the-meshify-c-or-meshify-c-mini-with-a-radiator-installed-in-the-front-) | 24 y especificaciones HTML 25; 315 mm con ventiladores delanteros. PDF descargado en memoria sin texto utilizable: no dibujos revisados |
| F14 | Noctua [NH-U12S redux](https://www.noctua.at/en/products/nh-u12s-redux/specifications) e [infosheet](https://cdn.noctua.at/media/noctua_nh_u12s_redux_infosheet_en_web.pdf), dimensiones/montaje | Índice oficial 24; acceso directo 429 |
| F15 | Noctua [NF-P12 redux-1700 PWM](https://www.noctua.at/en/products/nf-p12-redux-1700-pwm/specifications), Electrical/Mechanical | Índice oficial 24 |
| F16 | Noctua compatibilidad CPU [5700X](https://www.noctua.at/en/compatibility/by-components/cpus/amd-ryzen-7-5700x), [5600](https://www.noctua.at/en/compatibility/by-components/cpus/amd-ryzen-5-5600); motherboard [P03](https://www.noctua.at/en/compatibility/by-components/motherboards/asrock-b550m-pro4), [P18](https://www.noctua.at/en/compatibility/by-components/motherboards/asrock-b550m-steel-legend) | Índice 24 mostró NH-U12S redux compatible con 5700X; páginas directas 429. Para 5600 y ambas placas no se observó resultado positivo: P |
| F17 | Samsung [MZ-V7S500BW](https://www.samsung.com/sg/business/memory-storage/nvme-ssd/970-evoplus-nvme-m2-ssd-mz-v7s500bw/), Specifications Detail 500 GB | 24 conservada |
| F18 | SilverStone [CP14-E](https://www.silverstonetek.com/en/product/info/accessories/CP14-E/), Specifications/precaución de interferencias | 25 reconsulta |
| F19 | ASUS [instalación GPU](https://rog.asus.com/uk/support/faq/1047391/), II/b adaptador, cables PCIe independientes | 25 reconsulta |
| F20 | Corsair [curvatura 12V-2x6](https://www.corsair.com/us/en/explorer/diy-builder/power-supply-units/is-bending-a-12v-2x6-cable-bad/), tramo antes de doblar | 25 inglés: aproximadamente 30 mm; no certifica envolvente instalada |
| F21 | [B550 Pro4](https://www.asrock.com/mb/AMD/B550%20Pro4/index.asp), [manual](https://download.asrock.com/Manual/B550%20Pro4.pdf), pp. 4–9, 27, 29 | 25 manual; ficha HTML bloqueada |
| F22 | [B550M Steel Legend](https://www.asrock.com/mb/AMD/B550M%20Steel%20Legend/index.us.asp), [manual](https://download.asrock.com/Manual/B550M%20Steel%20Legend.pdf), pp. 2–9, 22, 25, 28–31, 43 | 25 manual, incluida relectura de conectores; HTML bloqueado |
| F23 | [KitGuru 5600/5700X](https://www.kitguru.net/components/cpu/luke-hill/amd-ryzen-7-5700x-ryzen-5-5600-review/all/1/), potencia/productividad y fotos | 24 conservada, fuente secundaria |
| F24 | [HWCooling PRIME 5070 OC](https://www.hwcooling.net/en/test-asus-prime-geforce-rtx-5070-12gb-oc-ed-great-value/), ejemplar/límite de potencia | 24 conservada, fuente secundaria |
| F25 | [NVIDIA RTX 4060](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/), Full Specs | 24 conservada, referencia GPU; no límite validado de P06 exacta |

## 3. Matriz de atributos → reglas → escenarios

Reglas R01–R10 y escenarios S01–S18 están definidos en [CU05](specs/CU05-compatibilidad.md). Valores agrupados comparten fuente/estado, no se extienden a otra variante. Un faltante se conserva aunque otra regla falle.

| Pieza / atributo | Valor y unidad / condición | Estado, fuente/localizador | Regla; escenarios |
|---|---|---|---|
| P01/P02 socket, núcleos/hilos, memoria | AM4; 6/12 y 8/16; DDR4; TDP 65 W no equivale a demanda DC | D F01/F02 Specifications | R01/R02/R05; S01–S04 |
| P03 soporte CPU exacto | P01/P02 desde BIOS P2.30; P2.30 instalada es C | D F04 filas P03 | R01; S01–S04, S11–S13 |
| P18 soporte P02 | Desde P2.30, según índice oficial conservado; P2.30 instalada propuesta | D F04 fila P18 + C; no inferir Zen3 del manual antiguo | R01; S05 |
| P03 formato, RAM | mATX 244×244 mm; 4 DIMM DDR4, máximo 128 GB | D F03 Specifications | R02/R07; S01–S05 |
| P18 formato, RAM | mATX; 4 DIMM DDR4, 128 GB; no conflicto de formato con P10 | D F22 pp. 2, 11; montaje exacto C | R02/R07; S05 |
| P04/P05 módulo | 8 GB 1Rx8 / 16 GB 2Rx8; UDIMM 288 pines no ECC/unbuffered, DDR4-3200 CL22 1,2 V; P04 altura 31,25 mm | D F05 referencias exactas; no usar descripción comercial 1Rx8 para P05 | R02/R08; S01/S02/S04 |
| RAM instalada | Dos módulos A2/B2; capacidad 16/32 GB; JEDEC, sin XMP | C; plataforma/CPU F01–F05; no prueba QVL ni estabilidad física | R02; S01–S05 |
| P03/P18 ranura y SSD | PCIE1 físico x16; M2_1 admite 2280 PCIe x4; con CPU seleccionado revisar negociación admitida, no rechazar por generación aislada | D F03/F22 Slots/Storage; manuales antiguos no prueban por sí solos todos los detalles de Vermeer | R03/R09; S01–S09 |
| P03/P18 recursos compartidos | M2_2 y SATA3_5/6 comparten; no utilizados en bases. M2_1 ocupado por P11 | D F03/F22 Storage; C asignación | R09; S01–S09 |
| P06 dimensiones L/H/T | 227,2 / 123,24 / 49,6 mm; 2,5 slots; PCIe 4.0; 8 GB; un PCIe 8-pin; recomendación 550 W | D F06 Tech Specs | R03–R06; S01–S07 |
| P15 dimensiones L/H/T | 304 / 126 / 50 mm; 2,5 slots; PCIe 5.0; 12 GB; un 16-pin; incluye adaptador 1→2; recomendación 750 W con salvedad de sistema OC | D F07 Tech Specs/Accessories | R03–R06; S08/S09/S14–S17 |
| P16 dimensiones L/H/T | 329 / 140 / 62,5 mm; 3,125 slots | D F08 Dimensions/Slot | R04; S10/S13 |
| P07 capacidad continua y térmica | 550 W; +12 V 44 A/528 W; +3,3/+5 V combinados 120 W; rating 30 °C; largo 125 mm | D F09 Power Table/Tech Specs | R05/R07; S01/S03/S04/S14 |
| P07 cables | ATX24 600 mm; EPS4+4 600 mm; **un ramal PCIe**, dos 6+2 a 500+100 mm; SATA un ramal/3 conectores, PATA un ramal/2 | D F09 Cable Table | R06; S01/S14/S15 |
| P08 capacidad y dimensiones | 750 W; +12 V 62,5 A/750 W; +3,3/+5 V 20 A cada uno, 110 W combinados; 140×150×86 mm; ATX 3.1 | D/X F10 RM750e Specifications frente a F11 | R05/R07; S02/S05/S07–S09 |
| P08 juego de cables | ATX24, dos EPS4+4 separados, 12V-2x6 nativo 650 mm; PCIe6+2 y SATA. Cantidad de PCIe de repuesto conflictiva, no necesaria para escenarios | D/X F10/F11 Included Cables | R06; S02/S05/S07–S09 |
| P09 límites y recursos | ATX/mATX/ITX; PSU ATX 180 mm; GPU L416 mm/H175 mm; cooler 170 mm; 7 slots; cable routing 23 mm; frontal USB-A/C5Gb/s, audio combinado, power | D F12 ficha exacta Specifications; no cota del cuerpo del enchufe | R04/R07/R10; S01/S03–S09 |
| P10 límites y recursos | ATX/mATX/ITX; PSU ATX 175 mm; GPU L315 mm con fans delanteros; cooler 170 mm; 7 slots; cable routing 35 mm; 2 USB-A5Gb/s, audio/mic separados, power/reset | D F13 Specifications/FAQ; H lateral GPU/cable P | R04/R07/R10; S02/S05/S06/S10 |
| P12 cooler | AM4; altura 158 mm; capacidad para P02 listada como compatible en índice Noctua; NSPR no son watts | D F14/F16 (parcial); interferencias placa/RAM P | R08; S01–S09 |
| P13 ventilador | 120×120×25 mm; PWM4-pin; 12 V; máximo 0,09 A/1,08 W por unidad | D F15 Electrical/Mechanical | R05/R06/R08; S01–S09 |
| P03/P18 headers ventilador | CPU_FAN1 máximo 1 A; CHA_FAN1–4/WP máximo 2 A cada uno; uno por fan, 0,09 A < ambos límites | D F03/F22 Connector + C asignación | R06/R08; S01–S09 |
| P11 SSD | 500 GB; M.2 2280, PCIe3x4 NVMe, 3,3 V; 9 W máximo burst para SKU500 GB | D F17 Specifications Detail; cifra de familia no sustituye tabla exacta | R05/R09; S01–S09 |
| P14 adaptador | Host19-pin → Key-A20-pin; 24×10×30 mm; velocidad host; advertencia de interferencias | D F18 Specifications; encaje en P03/P09 P | R10/R04; S01/S03/S04/S06–S09 |
| Cable P08/P15 | Aproximadamente 30 mm rectos antes de doblar según guía inglesa; cuerpo del conector/offset/trayectoria no acotados | D F20 guía general; envolvente instalada P | R04/R06; S08/S09 |
| Demandas DC completas y por salida | No hay cota justificada de placa/RAM/pérdidas CPU/GPU exacta P06, ni reserva/transitorios del conjunto | P; referencias parciales F23–F25 | R05; todos los positivos |

### Ejes y geometría: comprobado y pendiente

Normalización propuesta: **L** desde bracket hacia frontal; **H** desde ranura/placa hacia panel lateral (ASUS segunda dimensión, Fractal GPU width); **T** perpendicular al PCB GPU, que invade slots vecinos. Conservar etiqueta/eje original además de normalizado. No comparar ancho externo del gabinete ni altura máxima del cooler con H GPU.

- L: P06 cabe en límites principales de ambos gabinetes; P15 304 <416 mm en P09. P16 329 >315 mm en P10: fallo demostrado de 14 mm aun si las demás reglas quedan abiertas.
- Slots: ambos gabinetes documentan siete; P06/P15 ocupan 2,5. Reservar tres posiciones contiguas desde PCIE1, sin otras tarjetas. Esto cierra el recuento nominal, no la colisión con shroud/headers ni T efectiva. No sumar siete slots del gabinete a los de la placa.
- Altura cooler: 158 <170 mm en ambos. Anclaje AM4 documentado; no demuestra ausencia de interferencia con VRM/RAM/primer slot. F16 no permitió cerrar cooler/placa.
- P09 H175 − P15 H126 =49 mm nominales: **no** acredita automáticamente el cable. El cuerpo del enchufe, la posición del receptáculo, el tramo recto y la curvatura deben caber en el mismo sistema de referencia. No convertir 126+30 o 126+40 en un positivo certificado.
- P10 no publica una cota H GPU/cable utilizable en lo examinado. Un texto genérico de traducciones HTML “GPU max width” sin valor del modelo no es evidencia.
- PSU: largos P07 125 y P08 140 mm inferiores a límites 180/175 mm; falta envolvente efectiva de salidas/cables y recorrido sin interferencias. Cable routing detrás de bandeja no es longitud libre delante de fuente.
- P14 tiene dimensiones verificadas, pero no cotas de separación en el header elegido con GPU/cables instalados. Sigue P. No usar “cables fuera” como indicador de resto comprobado.

## 4. Asignación de conectores y recursos

IDs de ramal exclusivos dentro de cada configuración. Conectores sin utilizar no se reasignan de forma implícita. Los dos 6+2 de un mismo ramal no son cables independientes.

| Configuración | Recurso origen | Destino exclusivo / estado |
|---|---|---|
| A/P07 | CX-ATX1 24-pin | P03 ATXPWR1 |
| A/P07 | CX-EPS1 4+4 completo | P03 ATX12V1 8-pin, nunca PCIe |
| A/P07 | CX-PCI1.a 6+2 | P06 8-pin; CX-PCI1.b sin usar |
| A/P07 | CX-SATA1 / CX-PATA1 | Sin dispositivos; no alimentar GPU mediante estos |
| B/P08 y A tras fuente | RM-ATX1 | P03 ATXPWR1 |
| B/P08 y A tras fuente | RM-EPS1 completo | P03 ATX12V1; RM-EPS2 libre |
| B/P08 y A tras fuente | RM-PCI1.a 6+2 | P06 8-pin; resto de ese ramal libre |
| A tras GPU | RM-16N1 nativo | P15 16-pin completamente insertado; retirar RM-PCI1 de P06 retirada; ningún adaptador necesario |
| B tras placa P18 | RM-ATX1 / RM-EPS1 | P18 ATXPWR1 / ATX12V1 8-pin |
| B tras placa P18 | RM-EPS2, una mitad 4-pin | P18 ATX12V2, mitad restante sin conectar; adicional explícitamente opcional F22 p.31 |
| Ambas P03; también P18 en B | CPU_FAN1 | Fan incluido P12 |
| Ambas P03; también P18 en B | CHA_FAN1/WP, CHA_FAN2/WP, CHA_FAN3/WP | Delantero1, delantero2, trasero, uno por header; CHA_FAN4 y CPU_FAN2 libres |
| A/P03 | F_USB3_1_2 | USB-A frontal P09, header reservado completo |
| A/P03 | F_USB3_3_4 | P14 → USB-C P09; no sirve simultáneamente otro cable USB-A |
| B/P03 y B/P18 | F_USB3_1_2 | Cable frontal doble USB-A P10; F_USB3_3_4 libre |
| Ambas | HD_AUDIO1 | Cable HD Audio del gabinete; no AC97 implícito |
| A | PANEL1 pines power correspondientes | Encendido P09; reset sin interruptor en este gabinete, no “desconectado” de la base original |
| B/P03 o P18 | PANEL1 pines power y reset distintos | Encendido y reset P10; LEDs solo en pines correspondientes a cada función, sin compartir alimentación con botón |
| Ambas | M2_1 / PCIE1 / A2-B2 | P11 / GPU / dos módulos RAM; ningún recurso duplicado |

Longitudes disponibles de cables P07 y cable nativo P08 documentadas, pero recorrido efectivo/extensiones y espacio de montaje no probados. Los conectores ATX/EPS/GPU se evalúan también por tipo eléctrico, no solo cantidad de pines. P11 recibe energía de M.2/placa, no requiere cable SATA.

**Negativo P07 + P15 sola:** F07 incluye adaptador de un 16-pin a dos entradas de 8-pin. F19 II/b exige un cable PCIe separado para cada entrada y prohíbe usar las dos puntas del splitter de un cable. CX-PCI1.a y .b pertenecen al mismo ramal: no se puede construir la asignación requerida. No hay autorización para otro cable, splitter o adaptador SATA/Molex. La ausencia de 16-pin nativo **no** es el fallo por sí misma.

### Cambio de motherboard corregido

P17 en A pierde una asignación: solo `USB3_7_8`, un header19-pin (F21 p.27), frente a dos en P03 (F03 p.28). Además reduce USB traseros: no lo resuelve moverlo a B. Su CPU power es 8+4; F21 p.29 pide conectar el adicional pero el texto examinado no distingue stock/OC. **No** inferir universalmente obligatorio ni solo OC. Se retira este positivo sin introducir un divisor ni desconectar puertos.

P18 en B evita la dependencia: dos headers Gen1 (F22 pp.5,28–29), mantiene cuatro USB traseros Gen1, dos USB2 y Gen2 A/C, PS/2, red y funciones de audio; LAN pasa de 1 a 2,5 Gb/s. Conserva power/reset, fans, M2_1, RAM y GPU según mapa. No tiene VGA, pero P01/P02 no tienen gráfica integrada y las salidas de video de placa no eran funcionales en estas bases. Ethernet y drivers necesitan configuración del sistema, no una promesa de conservación automática del software. El EPS4 adicional es **opcional expresamente** (F22 p.31), y P08 tiene segundo EPS que se asigna sin dependencia nueva. Soporte P02/P2.30 según F04; no sustituirlo por la descripción de familias del manual anterior a Zen3. Quedan abiertos cooler/placa, recorrido físico y alimentación integral; precio P18 y pasta no cotizados. No se declara todavía `compatible` global.

### Cambio de gabinete corregido

B→P09 no agrega P14 automáticamente: **S06** propone explícitamente gabinete + P14 para activar USB-C con el segundo header. Aun así cambia dos USB-A a uno, pierde reset físico y pasa de jacks separados a combinado. P14 no restaura esas funciones. **El candidato actual falla R10 bajo el requisito propuesto de conservación funcional**, aunque otros datos sigan pendientes; queda abierta la elección de un sustituto compatible. No se afirma una sustitución compatible de gabinete. A→P10 tampoco sería equivalente: perdería USB-C. Se mantienen ambas bases sin complicarlas con dependencias no investigadas.

## 5. Fuente: conflicto y borrador excluido

**Resolución editorial propuesta `power-policy-25.1-draft`:** priorizar F10, manual técnico que identifica RPS0215/CP-9020295, +12 V **62,5 A/750 W**, sobre F11 comercial que muestra **54,2 A/750 W**. Mantener ambas observaciones X y el motivo; no hay confirmación del fabricante ni prueba de que haya cambiado el hardware. F10/F11 también difieren en cantidad de PCIe de repuesto; ATX, dos EPS y cable nativo necesarios sí están documentados. No extrapolar inventario conflictivo.

54,2 A×12 V=650,4 W es solo una operación sobre un dato contradictorio: **no es una tercera especificación**, límite adoptado ni criterio para aprobar. La prioridad editorial sigue propuesta, no decisión aceptada.

El 24 calculó 314,32/474,32 W. La suma usaba CPU paquete76 W (F23), pérdidas15 W, GPU115+25/250+50 W, placa50 W, RAM2×10 W, SSD9 W y fans4×1,08 W. **Se conserva únicamente como borrador E retirado de los veredictos.** No hay justificación suficiente para pérdidas/márgenes, placa, RAM y reparto por salidas. Los 76 W de paquete no son entrada EPS ni demanda de toda la PC; 115 W de NVIDIA no es límite de P06 exacta; F24 documenta 250 W por defecto de P15 (ajustable 175–300 W), no su transitorio máximo. Los 4,32 W de fans sí son aritmética sobre ratings documentados, pero no cierran la demanda del conjunto.

Política mínima propuesta: comparar demanda DC con potencia continua a temperatura aplicable, capacidad individual/combinada de salidas, conectores, límites relevantes y reserva justificada. Demanda/reserva sin evidencia → R05 pendiente, nunca cero. Cumplir recomendación ASUS de 550/750 W puede ser requisito conservador versionado, **no** evidencia suficiente de demanda ni prueba de fallo de arranque si se incumple. ATX3.1 no demuestra por sí sola transitorios de cualquier configuración. Eficiencia no es descuento sobre potencia DC disponible. Detalles en CU05.

## 6. Precios históricos y presupuesto

Observaciones **del 24, 2026-10-20**, conservadas sin reconsulta de ofertas en esta etapa. Moneda ARS, no disponibilidad en vivo. Condiciones faltantes no se completan por suposición. Nuevas consultas futuras deben crear nueva observación.

| Oferta ID / pieza | URL | Importe ARS | Condición/stock y pago observados | Envío/otros |
|---|---|---:|---|---|
| O01 / P15 | [Enjoy](https://enjoycomputer.com.ar/producto/placa-de-video-asus-prime-rtx-5070-oc-12gb/) | 1.706.232 | Efectivo/transferencia; “Entrega en el día”; condición no explicitada | Envío excluido; extras no informados |
| O02 / P08 | [Exxit](https://exxit.com.ar/prod/5715/fuente-750w-corsair-rm750e--2025--cybenetics-gold-platinum-atx-3-1-full-modular-cp-9020295-ar) | 175.898 | IVA incluido/transferencia; stock alto; condición no explicitada | Envío no cuantificado; financiación con recargo |
| O03 / P15 | [INCOT](https://incot.com.ar/productos/placa-de-video/placa-de-video-asus-prime-rtx5070-o12g-168990.html) | 1.894.299 | Nuevo, en stock; precio publicado, tarjeta mayor | Envío aparte |
| O04 / P05 | [RMS](https://rms-enlinea.com.ar/producto/memoria-ddr4-kingston-16gb-3200-mhz-kvr32n22d8-16/) | 383.208,99 cada uno | Dos disponibles; condición/recargos de pago no explicitados | Envío desconocido |
| O05 / P02 | [Best](https://bestinformatica.com.ar/componentes-de-pc/procesadores/procesador-amd-ryzen-7-5700x-8-nucleos-16-hilos-hasta-46ghz-am4-100-100000926wof-457671.html) | 446.120 especial / 484.913 tarjeta | En stock; WOF sin cooler; condición precio especial a confirmar | Envío y pasta extra, sin cotizar |

Presupuesto propuesto `budget-demo-25.1`: **2.000.000 ARS solo componentes**. Sin crédito por reventa, envío, financiación ni mano de obra. No se los considera gratuitos. Dependencias de componentes requeridas sí deben presupuestarse; si no hay precio, el total no se cierra.

- **S16** O01+O02 = **1.882.130**, margen **117.870**. **S17** O03+O02 = **2.070.197**, excede **70.197**. Mismo hardware P08+P15, dos combinaciones de ofertas, no dos mejoras diferentes.
- Fuente con su juego de cables incluido; P14 ya pertenece a A, no se compra otra vez para el plan. El adaptador incluido en P15 no requiere compra adicional; con P08 se usa cable nativo. No hay otra dependencia de componentes identificada para este recorrido, pero si geometría obliga a añadir una, se deberá cotizar y recalcular. Costo aritmético sustentado no valida compatibilidad abierta.
- **S18** RAM completa: 2×O04 = **766.417,98**; margen **1.233.582,02**, condicionado a cargos de pago no explícitos. No sumar P04 retiradas ni asumir reventa.
- CPU requiere pasta; motherboard requiere pasta y condiciones de BIOS/montaje; gabinete propuesto requiere P14 y además solucionar funciones perdidas. Sin precios suficientes, no afirmar esos totales dentro de presupuesto.

## 7. Referencias visuales separadas

No se descargaron/copiarán imágenes en esta etapa. Cada fila separa procedencia, variante, tipo y uso. Todas tienen **permiso/licencia de reutilización pendiente**; enlazar no concede derechos. Imágenes oficiales pueden servir como material de catálogo identificado sin afirmar que sean fotos tomadas con cámara. Estos pendientes no bloquean preparar la base técnica del backend.

| Visual ID / pieza | Página de origen y selección | Variante representada | Tipo / estado de uso |
|---|---|---|---|
| V01/P01 | F23, `P1002097.jpg` | Ryzen 5600 | Foto editorial; solo referencia |
| V02/P02 | F23, `P1002096.jpg` | Ryzen 5700X | Foto editorial; solo referencia |
| V03/P03 | F03, galería Product Photo | B550M Pro4 original | Imagen oficial de catálogo; selección final pendiente |
| V04/P04 | F05, [búsqueda exacta](https://www.kingston.com/en/memory/search?partid=KVR32N22S8/8) | Página /8; imagen puede ser genérica | Catálogo; representatividad exacta pendiente |
| V05/P05 | F05 y galería O04 | Página /16; comprobar etiqueta al seleccionar | Catálogo/comercial; representatividad pendiente |
| V06/P06 | F06, galería del producto | DUAL OC EVO negra | Imagen oficial de catálogo; no llamarla foto editorial |
| V07/P07 | F09, galería | CX550 CP-9020277 2023 | Imagen oficial de catálogo |
| V08/P08 | F11, galería | RM750e CP-9020295 2025 | Imagen oficial de catálogo; no usar 2023 |
| V09/P09 | F12, galería Black Solid | FD-C-POA2A-01 | Imagen oficial de catálogo; no TG/RGB |
| V10/P10 | F13, galería y selector | FD-CA-MESH-C-BKO | Catálogo; cotejar Solid antes de incorporar |
| V11/P11 | F17, front/back | 500 GB MZ-V7S500BW | Imagen oficial de catálogo |
| V12/P12 | [APH Networks](https://aphnetworks.com/reviews/noctua-nh-u12s-redux) | NH-U12S redux y accesorios | Foto editorial |
| V13/P13 | [APH Networks](https://aphnetworks.com/reviews/noctua-nf-p12-redux) | Review de varias variantes redux | Foto editorial; seleccionar 1700 PWM inequívoco |
| V14/P14 | F18, High resolution photos | CP14-E | Material oficial de producto |
| V15/P15 | F24, ejemplar de review; F07 catálogo | PRIME-RTX5070-O12G | Foto editorial / catálogo, mantener distinción |
| V16/P16 | [HWCooling](https://www.hwcooling.net/en/asus-tuf-geforce-rtx-5070-12gb-oc-ed-perfectionism/) | TUF-RTX5070-O12G-GAMING | Foto editorial |
| V17/P17 | F21 | B550 Pro4 | Referencia de catálogo, selección visual no verificada; candidato retirado |
| V18/P18 | F22 página del producto | B550M Steel Legend | Referencia oficial; HTML bloqueado, selección visual pendiente |

## 8. Estado de cierre

Fundamentados: negativo de cableado, negativo dimensional, soporte mínimo de BIOS, mapa lógico de conectores corregido, aritmética/ofertas. Resueltos parcialmente: recuento nominal de slots, longitudes principales, altura cooler, EPS opcional P18, dos headers USB y recursos de placa.

Abiertos para positivos globales: R05 demanda/reserva fundamentada, R04 envolventes/recorridos efectivos, R08 interferencias/capacidad donde no se observó soporte, R10 encaje P14 y conservación funcional del gabinete candidato; revisar negociación PCIe con evidencia aplicable a Vermeer/P15. No hay seis sustituciones compatibles cerradas ni plan completo validado todavía. La tabla normativa de resultados y bloqueos por escenario está en CU05. No usar nombres de bases como lista blanca ni un flag de “resto comprobado”.
