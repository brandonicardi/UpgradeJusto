import Link from "next/link";
import "../share.css";

export default function NotFound() { return <section className="share-screen share-unavailable"><h1>Este enlace ya no funciona</h1><p>El enlace no existe o dejó de estar disponible. Si querés ver el plan, pedile un enlace nuevo a quien te lo pasó.</p><Link href="/">Ir al inicio</Link></section>; }
