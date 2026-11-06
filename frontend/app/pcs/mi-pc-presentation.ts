// Presentación de Mi PC: traduce lo que devuelve la API a palabras para personas. No decide nada.
export const piezasCargadas = (estados: string[]) => estados.filter(estado => estado === "present").length;
