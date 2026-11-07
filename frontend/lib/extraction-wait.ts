// Groq responde en segundos; el modelo local lee el catálogo en una sola placa y tarda más.
export function extractionWaitMs(): number {
  return process.env.UJ_EXTRACTION_PROVIDER === "llamacpp" ? 125000 : 35000;
}
