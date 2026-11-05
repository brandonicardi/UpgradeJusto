import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

// React necesita saber que está dentro de un entorno de pruebas para vaciar los efectos con act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mounted: { root: Root; host: HTMLElement }[] = [];
export async function mount(element: ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div"); document.body.appendChild(host);
  const root = createRoot(host); mounted.push({ root, host });
  await act(async () => { root.render(element); });
  return host;
}
export async function unmountAll() {
  for (const { root, host } of mounted) { await act(async () => { root.unmount(); }); host.remove(); }
  mounted = []; document.body.innerHTML = "";
}
/** Deja pasar promesas pendientes (fetch falso, efectos) dentro de act(). */
export async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }
export async function click(el: Element | null | undefined) {
  if (!el) throw new Error("No se encontró el elemento a clickear");
  await act(async () => { (el as HTMLElement).click(); });
  await settle();
}
export async function type(el: Element | null | undefined, value: string) {
  if (!el) throw new Error("No se encontró el campo");
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const event = el instanceof HTMLSelectElement ? "change" : "input";
  await act(async () => { Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value); el.dispatchEvent(new Event(event, { bubbles: true })); });
}
export const byText = (root: ParentNode, selector: string, text: string | RegExp) =>
  Array.from(root.querySelectorAll<HTMLElement>(selector)).find(el => typeof text === "string" ? el.textContent?.trim() === text : text.test(el.textContent ?? "")) ?? null;
export const button = (root: ParentNode, name: string | RegExp) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(el => { const label = el.getAttribute("aria-label") ?? el.textContent?.trim() ?? ""; return typeof name === "string" ? label === name : name.test(label); }) ?? null;
export const byLabel = (root: ParentNode, label: string | RegExp) => {
  const found = Array.from(root.querySelectorAll<HTMLLabelElement>("label")).find(el => typeof label === "string" ? el.textContent?.trim().startsWith(label) : label.test(el.textContent ?? ""));
  return (found?.control ?? found?.querySelector("input,select,textarea") ?? null) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
};
