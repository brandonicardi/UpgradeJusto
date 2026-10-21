"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section role="alert"><h1 className="text-2xl font-bold">No se pudo mostrar esta página</h1><p className="my-4">Ocurrió un error. No se modificó ningún dato.</p><button onClick={reset}>Reintentar</button></section>; }
