# CU02 — contrato Sprint33 (autorizado24/10)

## Delta autorizado38 — antes de implementar

Extracción torre con nueve categorías y líneas/declaraciones editables, unknown no
es absent. Propuesta no persiste; `confirmed:true` explícito antes de PCService y
propiedad servidor. Rutas `/api/towers/extract` y `/extract/confirm`, DTO y evidencia
según [contrato38 §1/7](../../backend/INTEGRAL38_CONTRACT.md). Cap65536 y cuota común37.
Aceptación: varias unidades/discos diferentes, declarado conservado, edición antes
de guardar, sin escritura por extracción/cancelación y selección posterior al50.
Solo texto hardware; no detectar/leer archivos del sistema ni pegar reportes privados.
Es contrato autorizado, **no resultado ejecutado**; cierre histórico33 se conserva.

## Alcance y decisión

Texto pegado de hasta12000 caracteres, Groq/infraestructura existentes y catálogo
real, timeout total30s. Sin archivos ni detección local. Texto no confiable: sus
instrucciones no autorizan herramientas/escrituras. No logs de texto/prompt/respuesta
cruda ni persistencia del original. Sesión y propietario se resuelven en servidor.

Propuesta **stateless**, editable; metadata del cliente no es traza autenticada.
Nada persiste una PC antes de confirmación explícita mediante PCService. Unknown y
ambigüedad no equivalen a selección, cero o falso; no fabricar fuentes/capacidades.

## API corta — anterior al frontend

Rutas bajo prefijo API existente, JSON cerrado, sesión requerida.

- `POST /pcs/extract` `{text: string}` →200 `{proposal: {name, components},
  evidence: [{field, origin, excerpt, candidate_ids}], warnings: [string],
  dataset_version: string}`. `name/components` reutilizan el DTO editable existente
  de creación de PC, sin propietario. Backend fija su mapa exacto antes del frontend;
  no crear otro modelo de componentes. `origin`: `catalog|text|unknown|ambiguous`.
  `excerpt` opcional: fragmento acotado devuelto al solicitante, no log/persistencia.
  Candidatos son IDs reales de la revisión consultada, nunca inventados. Desconocidos
  usan la representación soportada por PCService; no autocompletar ambigüedades.
- `POST /pcs/extract/confirm` `{confirmed: true, pc: <DTO creación PC>,
  metadata: {dataset_version: string, edited: boolean}}` →201 DTO PC existente.
  Falta/falso en `confirmed` se rechaza. Metadata es declaración del cliente, no
  prueba de extracción. Revalidar referencias/datos de guardado; revisión no
  disponible o referencia cambiada →409 y revisión por usuario, sin remapeo silencioso.
  PCService recibe propietario de sesión, nunca un `user_id` del payload.

401 sin sesión;422 entrada inválida/exceso/campos extra;429 cuota;502 proveedor/JSON
inválido;504 timeout;409 revisión obsoleta. Errores sin secretos ni texto original.
Sin fallback simulado ni guardado parcial. Repositorio fija revisión al construirse
por request para matching consistente. Edición manual no se presenta como validada
por IA. Confirmar crea PC y **no garantiza idempotencia**: bloquear doble envío en UI,
sin retry automático; resultado de red incierto invita a revisar lista de PCs antes
de reenviar. No afirmar exactamente una PC ante reintentos.

## Aceptación — FUNCIONAL LOCAL APROBADO25/10

Mismo revisor aprobó delta UI y cancelación. Gate real Build: Groq preview200 con
6 evidencias y PC0 antes de confirmar; edición manual RAM3/BIOS, confirm201, reload
persistido y B GET/PUT/DELETE404. Cancelación postpropuesta probada aparte con
respuesta CONTROLADA solo en POST extract (fixture explícita, no prueba LLM), auth
PG real, confirm nunca mock, counter0 y mismo número de PCs antes/después.
Límites: texto pegado, sin archivos/detección; un worker local, sin despliegue.
Los criterios siguientes definen alcance, no promesa de precisión universal.

- Groq y catálogo reales → propuesta revisable sin crear PC; edición + confirmación
  crea PC del usuario A; B no puede leerla/modificarla.
- Unknown/ambigüedad, texto malicioso, exceso, JSON inválido, timeout/cuota: sin
  guardado ni exposición de texto/secretos. Confirmación falsa y propietario/campos
  inyectados rechazados; revisión obsoleta409.
- UI accesible, estados carga/error, selección manual y «Confirmar y guardar»;
  doble clic bloqueado e incertidumbre de red explicada. No mocks como cierre.

Backend único y frontend único en sus carpetas. Backend puede ajustar mapa al DTO y
formato común de error, registrándolos antes del frontend; cambios semánticos/rutas
requieren actualizar este contrato. Evidencia y límites del cierre en SPRINT33 y
bitácora33; checks técnicos de cierre pendientes allí no equivalen a falla funcional.
