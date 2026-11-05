// Tabla de navegación del encabezado y reglas de "página actual".
export const mainRoutes = [["/pcs", "Mi PC"], ["/tower-plans", "Mi plan"], ["/chat", "Asistente"], ["/catalog", "Catálogo"]] as const;
export const accountRoute = ["/account", "Tu cuenta"] as const;
export const adminRoute = ["/admin", "Administración"] as const;

export function isSharedPath(pathname: string) { return pathname.startsWith("/shared-tower-plans/"); }

export function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
    || (href === "/pcs" && (pathname === "/" || pathname === "/build"))
    || (href === "/tower-plans" && (pathname === "/plans" || pathname.startsWith("/plans/")));
}

// Solo muestra el enlace; el servidor sigue siendo quien confirma el rol.
export function utilityRoutes(adminAllowed: boolean) {
  return adminAllowed ? [accountRoute, adminRoute] : [accountRoute];
}
