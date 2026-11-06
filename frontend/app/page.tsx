import type { Metadata } from "next";
import BeginnerEntry from "../components/beginner-entry";
export const metadata: Metadata = { title: "UpgradeJusto: tu PC puede dar más", description: "Contanos qué querés mejorar y cuánto querés gastar. Te decimos qué conviene cambiar, cuánto cuesta y si encaja con tu PC." };
export default function Home() { return <BeginnerEntry />; }
