import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import Shell from "../components/shell";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = { title: "Tu próxima mejora | UpgradeJusto", description: "Mejorá tu PC con compatibilidad, objetivos y presupuesto respaldados por evidencia." };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" data-theme="claro" className={`${bricolage.variable} ${figtree.variable}`}><body>
    <Shell>{children}</Shell>
  </body></html>;
}
