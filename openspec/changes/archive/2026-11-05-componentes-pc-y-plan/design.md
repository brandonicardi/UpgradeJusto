# Design

Mismas reglas que `componentes-base`: utilidades de tokens, sin hexadecimales, props en español,
excepciones de medidas y `!` aceptadas en su diseño. Reutilizan `Verdict`, `PriceTag` y `Button`.

```ts
<PcSlots piezas={{ cpu: { nombre, enDuda?, falta? }, ... }} hrefAgregar={(categoria) => string} />
<GoalPicker pregunta opciones={[{ valor, texto }]} valor onCambio multiple? />
<BudgetSlider min max paso moneda valor atajos={[{ valor, texto }]} onCambio />
<UpgradeCard titulo actual nueva motivos precio diferencia veredicto onSumar />
<PlanSteps total etapas={[{ nombre, costo, estado, veredicto }]} />
```

Las categorías y su orden salen de una constante única: `cpu`, `motherboard`, `ram`, `gpu`, `psu`,
`case`, `storage`, `cooler`, `fan`, con el mismo mapa de íconos que `PartCard`.

`BudgetSlider` guarda el valor como texto entero, sin `float`, y usa `input type="range"`
accesible más un campo. `UpgradeCard` no calcula: recibe `diferencia` ya resuelta por la API.
