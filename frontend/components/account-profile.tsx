import type { PublicUser } from "../lib/public-user";

function Dato({ etiqueta, children }: { etiqueta: string; children: string }) {
  return <div className="grid min-w-0 gap-space-1"><dt className="text-chico text-tinta-suave">{etiqueta}</dt><dd className="m-0 text-cuerpo-fuerte text-tinta [overflow-wrap:anywhere]">{children}</dd></div>;
}

/** Datos de la sesión, solo lectura. */
export default function AccountProfile({ user }: { user: PublicUser }) {
  return <dl className="m-0 grid gap-space-4 sm:grid-cols-2">
    <Dato etiqueta="Tu correo">{user.email ?? "Email no disponible"}</Dato>
    {"auth_provider" in user && <>
      <Dato etiqueta="Cómo te llamamos">{user.display_name ?? "Nombre no disponible"}</Dato>
      <Dato etiqueta="Cómo entrás">Google</Dato>
    </>}
  </dl>;
}
