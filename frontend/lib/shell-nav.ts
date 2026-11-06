// Tabla de navegación del encabezado y reglas de "página actual".
// Mismo orden y textos que el encabezado de las maquetas. El asistente se abre con «¿Dudas?».
export const mainRoutes = [["/pcs", "Mi PC"], ["/conviene", "Lo que te conviene"], ["/tower-plans", "Mi plan"], ["/catalog", "Catálogo"]] as const;
export const accountRoute = ["/account", "Tu cuenta"] as const;
export const adminRoute = ["/admin", "Administración"] as const;

export function isSharedPath(pathname: string) { return pathname.startsWith("/shared-tower-plans/"); }

export function isCurrent(pathname: string, href: string) {
  // «Lo que te conviene» tiene su propia dirección; "/" es la entrada y cuenta como «Mi PC».
  // Así nunca hay dos enlaces marcados a la vez.
  return pathname === href || pathname.startsWith(`${href}/`)
    || (href === "/pcs" && (pathname === "/" || pathname === "/build"))
    || (href === "/tower-plans" && (pathname === "/plans" || pathname.startsWith("/plans/")));
}

// Solo muestra el enlace; el servidor sigue siendo quien confirma el rol.
export function utilityRoutes(adminAllowed: boolean) {
  return adminAllowed ? [accountRoute, adminRoute] : [accountRoute];
}
