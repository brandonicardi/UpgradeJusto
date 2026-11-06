"use client";
import { useEffect, useState } from "react";
import { vendorImageURL, displayRetailDate } from "../lib/retail-presentation";
import type { PublicTowerShare } from "../lib/tower-share-dto";
export default function PublicSharePhoto({ photo, compact = false }: { photo: PublicTowerShare["components"][number]["image"]; compact?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = photo ? vendorImageURL(photo.url) : null;
  useEffect(() => { const restore = (event: PageTransitionEvent) => { if (event.persisted) location.reload(); }; window.addEventListener("pageshow", restore); return () => window.removeEventListener("pageshow", restore); }, []);
  const size = compact ? 72 : 128;
  // Historical allowlisted URL only: Next Image optimization would add a server fetch.
  // eslint-disable-next-line @next/next/no-img-element
  const image = url && failed !== url && photo ? <img src={url} width={size} height={size} loading="lazy" alt={photo.alt} referrerPolicy="no-referrer" onError={() => setFailed(url)} /> : null;
  if (compact) return image ? <div className="share-photo">{image}</div> : null;
  return <div>{image ?? <p className="placeholder">Sin foto pública disponible</p>}{photo && <><p>{photo.bytes_verified ? "Bytes verificados según la publicación; no prueba atributos técnicos" : "Bytes de imagen no verificados"} · consultada {displayRetailDate(photo.retrieved_at)}</p><p>{photo.rights_notice}</p></>}</div>;
}
