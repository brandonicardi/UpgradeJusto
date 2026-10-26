import type { Metadata } from "next";
import Shell from "../components/shell";
import "./globals.css";

export const metadata: Metadata = { title: "Tu próxima mejora | UpgradeJusto", description: "Mejorá tu PC con compatibilidad, objetivos y presupuesto respaldados por evidencia." };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>
    <Shell>{children}</Shell>
  </body></html>;
}
