# Referencias curadas de rendimiento38

Investigación para CU06 autorizada; **no prueba de implementación ni medición propia**.
Consulta26/10/2026. Usar únicamente en el contexto indicado, con procedencia y fecha.
No deducir FPS desde estas cifras ni rendimiento desde VRAM/núcleos/precio.
La asociación con componentes exige identidad técnica explícita, no parecido de nombre.

## Productividad: solo render CPU Blender Cycles4.5.0

Fuente oficial comunitaria Blender Open Data, filtro `device_type=CPU`,
`blender_version=4.5.0`, `group_by=device_name`. Resultados consultados por investigadora
general independiente y repetidos por Build mediante HTTP JSON público:

| Nombre de dispositivo reportado | Mediana de score | Muestras |
|---|---:|---:|
|AMD Ryzen 5 5600 6-Core Processor|149.8979371914048|131|
|AMD Ryzen 7 5700X 8-Core Processor|214.38925258002163|424|

Consultas reproducibles:
- https://opendata.blender.org/benchmarks/query/?device_name=AMD+Ryzen+5+5600+6-Core+Processor&device_type=CPU&blender_version=4.5.0&group_by=device_name&response_type=datatables
- https://opendata.blender.org/benchmarks/query/?device_name=AMD+Ryzen+7+5700X+8-Core+Processor&device_type=CPU&blender_version=4.5.0&group_by=device_name&response_type=datatables
- Definición: https://opendata.blender.org/about/#benchmark-score

Respuestas JSON congeladas por Build en almacenamiento local ignorado,311/313 bytes:
5600 SHA256 `03fca95c706283a06e213b20f8c2719589528651618946375ef3c550ad5a54c9`;
5700X SHA256 `12ef15b24d8e498655281a6eb172ab05fd6253247edefb427e58e5285c4d9a6f`.
Mismos valores y muestras que la consulta independiente; no ejecutar el benchmark
en el equipo del usuario ni interpretar el score como dato de su sistema.

Unidad: estimación de muestras/minuto sumadas entre escenas, mayor mejor. Cociente
derivado ≈1.4302, **≈43% más score en este benchmark**, no productividad general ni
reducción garantizada de tiempo. Datos dinámicos comunitarios con plataformas/OC
heterogéneos, no comparación controlada del equipo del usuario. No extrapolar a
ofimática, compilación u otras aplicaciones. Disponibilidad/compatibilidad/coste de
cooler y materiales se comprueban separadamente, no por esta referencia.

## Juegos: índice GPU raster nativo2560×1440

TechPowerUp, NVIDIA GeForce RTX5070 Founders Edition Review, publicada04/03/2025:
- Resumen: https://www.techpowerup.com/review/nvidia-geforce-rtx-5070-founders-edition/35.html
- Método: https://www.techpowerup.com/review/nvidia-geforce-rtx-5070-founders-edition/7.html
- Gráfico exacto: https://tpucdn.com/review/nvidia-geforce-rtx-5070-founders-edition/images/relative-performance-2560-1440.png

| GPU de referencia | Índice,5070FE=100 |
|---|---:|
|RTX4060 8GB|48|
|RTX5070 FE12GB|100|
|RTX5070 Ti16GB|123|

Build descargó y observó la imagen real; investigadora general la observó
independientemente y corroboró los tres valores. PNG HTTP200,image/png,98539 bytes,
SHA256 `cc86969af873d864355e5715c2a1860fb1f95726e4c35f8adeff6ef2bb0ff74e`.
Imagen conservada solo local ignorada, **no redistribuida** ni licencia de dataset
atribuida a la foto/gráfico. Referencias numéricas y atribución no autorizan copiar
el gráfico protegido en el producto público.

Resumen combinado de juegos sin RT, resoluciones nativas, sin DLSS/FSR. Plataforma
de referencia GPU2025.1 Ryzen9800X3D/DDR5-6200/Windows11 24H2; RTX5070 con driver572.50,
otras NVIDIA566.14. Valores relativos, **no FPS**, no predicción exacta de PC propia.
Un mayor índice indica mejor referencia en ese conjunto de juegos, no en cada juego.
Modelos FE/referencia no son medición exacta de ASUS Dual/Prime/TUF OC; si se acepta
correspondencia explícita de GPU/memoria para usar referencia, debe mostrarse esa
limitación, nunca presentarla como benchmark físico de la variante de tienda.
5070 y5070Ti son distintos; no intercambiarlos ni usar VRAM para interpolar índices.

## Integración pendiente

Backend debe versionar y aplicar estas referencias con contexto explícito antes de
proponer opciones por objetivo; no incorporar una whitelist de IDs de demo. Sin
referencia aplicable, beneficio desconocido y comparación manual claramente nombrada.
Motor determinístico y cobertura/costes siguen siendo gates independientes.
