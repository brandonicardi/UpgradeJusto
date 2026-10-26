import type { ReactNode } from "react";

export function Card({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return <section aria-label={label} className={`surface ${className}`}>{children}</section>;
}
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warning" | "danger" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Alert({ children }: { children: ReactNode }) { return <div className="notice" role="alert">{children}</div>; }
export function Price({ amount }: { amount: string | null }) {
  return <span>{amount === null || !/^\d+(?:\.\d{1,2})?$/.test(amount) ? "Precio total por confirmar" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(amount))}</span>;
}
