import type { Metadata } from "next";
import BeginnerEntry from "../components/beginner-entry";
import { catalogTowerPage } from "../lib/catalog-tower-consumer";
import { displayImage } from "../lib/retail-presentation";
import type { TowerComponent } from "../lib/tower-catalog";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quiero mejorar mi PC | UpgradeJusto", description: "Empezá por las piezas que conocés o consultá una guía para identificar tu PC sin abrirla." };
export default async function Home() { let sample: TowerComponent | null = null; try { const data = await catalogTowerPage("?page=1&page_size=50"); sample = data.items.find(part => displayImage(part) !== null) ?? null; } catch { /* Real catalog unavailable; explicit empty state, no invented PC. */ } return <BeginnerEntry sample={sample} />; }
