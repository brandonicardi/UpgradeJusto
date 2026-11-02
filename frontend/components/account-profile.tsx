import type { PublicUser } from "../lib/public-user";
export default function AccountProfile({ user }: { user: PublicUser }) {
  return <details className="accordion"><summary>Datos de mi cuenta</summary><p>{user.email ?? "Email no disponible"}</p>{"auth_provider" in user && <><p>Acceso: Google</p><p>{user.display_name ?? "Nombre no disponible"}</p></>}</details>;
}
