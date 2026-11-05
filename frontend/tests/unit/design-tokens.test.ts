// `docs/sistema-diseno/tokens.json` manda: esta prueba lo lee en cada corrida y
// comprueba que `app/globals.css` tenga cada token (colores en tema claro y oscuro,
// espacios, radios, sombras y estilos tipográficos) y su entrada en `@theme`.
// Si cambia un valor en tokens.json y no en el CSS, falla.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Themed = { claro: string; oscuro: string };
type Tokens = {
  color: { tokens: { name: string; value: Themed }[] };
  type: {
    groups: {
      styles: { name: string; fontSize: string; lineHeight: string; fontWeight: number; letterSpacing?: string }[];
    }[];
  };
  spacing: { tokens: { name: string; value: string }[] };
  radius: { tokens: { name: string; value: string }[] };
  shadow: { tokens: { name: string; value: Themed }[] };
};

type Block = { selector: string; parents: string[]; own: string };
type Decls = Map<string, string>;

const tokens: Tokens = JSON.parse(
  readFileSync(new URL("../../../docs/sistema-diseno/tokens.json", import.meta.url), "utf8"),
);
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// Separa un texto CSS en sus declaraciones propias y sus bloques hijos (un nivel).
function scan(text: string): { own: string; blocks: { selector: string; body: string }[] } {
  const blocks: { selector: string; body: string }[] = [];
  let own = "";
  let i = 0;
  for (;;) {
    const open = text.indexOf("{", i);
    if (open === -1) {
      own += text.slice(i);
      break;
    }
    const prelude = text.slice(i, open);
    const semi = prelude.lastIndexOf(";");
    own += prelude.slice(0, semi + 1);
    let depth = 1;
    let close = open + 1;
    while (close < text.length && depth > 0) {
      if (text[close] === "{") depth += 1;
      else if (text[close] === "}") depth -= 1;
      close += 1;
    }
    blocks.push({ selector: prelude.slice(semi + 1).trim().replace(/\s+/g, " "), body: text.slice(open + 1, close - 1) });
    i = close;
  }
  return { own, blocks };
}

function flatten(text: string, parents: string[] = []): Block[] {
  const { own, blocks } = scan(text);
  const result: Block[] = parents.length ? [{ selector: parents[parents.length - 1], parents: parents.slice(0, -1), own }] : [];
  for (const block of blocks) {
    const inner = flatten(block.body, [...parents, block.selector]);
    result.push(...inner);
  }
  return result;
}

// Tolera espacios y saltos de línea, sin depender del formato exacto de cada valor.
function normalize(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .toLowerCase();
}

function declarations(blocks: Block[]): Decls {
  const decls: Decls = new Map();
  for (const block of blocks) {
    for (const match of block.own.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
      decls.set(match[1], normalize(match[2]));
    }
  }
  return decls;
}

const blocks = flatten(css);
const isDarkMedia = (parent: string) => /^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)$/i.test(parent);

const root = declarations(blocks.filter((b) => b.selector === ":root" && b.parents.length === 0));
const darkMedia = declarations(blocks.filter((b) => b.selector.startsWith(":root") && b.parents.some(isDarkMedia)));
const darkAttr = declarations(
  blocks.filter((b) => b.parents.length === 0 && /^:root\[data-theme\s*=\s*["']?oscuro["']?\]$/.test(b.selector)),
);
const theme = declarations(blocks.filter((b) => /^@theme(\s+\w+)*$/.test(b.selector)));

function expectValue(failures: string[], decls: Decls, name: string, expected: string, where: string, what: string) {
  const actual = decls.get(name);
  if (actual === undefined) failures.push(`falta ${what} en ${where}: ${name}: ${expected}`);
  else if (actual !== normalize(expected)) failures.push(`${what} en ${where}: ${name} vale "${actual}", debería valer "${expected}"`);
}

function expectEntry(failures: string[], name: string, what: string) {
  if (!theme.has(name)) failures.push(`falta la entrada de ${what} en @theme: ${name}`);
}

const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");
const workbenchCss = stripComments(readFileSync(new URL("../../app/v0-workbench.css", import.meta.url), "utf8"));

// Los colores fijos solo pueden vivir donde se definen los tokens.
function isTokenDefinition(block: Block): boolean {
  if (block.selector === ":root" && block.parents.length === 0) return true;
  if (block.selector.startsWith(":root") && block.parents.some(isDarkMedia)) return true;
  if (block.parents.length === 0 && /^:root\[data-theme\s*=\s*["']?oscuro["']?\]$/.test(block.selector)) return true;
  return /^@theme(\s+\w+)*$/.test(block.selector);
}

function hardcodedColors(text: string): string[] {
  const found: string[] = [];
  for (const block of flatten(text)) {
    if (isTokenDefinition(block)) continue;
    const where = [...block.parents, block.selector].join(" { ");
    for (const decl of block.own.split(";")) {
      const matches = decl.match(/#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)/gi);
      if (matches) found.push(...matches.map((value) => `${where}: ${value} (en "${normalize(decl)}")`));
    }
  }
  return found;
}

describe("colores fijos fuera de los tokens", () => {
  it.each([
    ["app/globals.css", css],
    ["app/v0-workbench.css", workbenchCss],
  ])("%s no usa hexadecimales ni rgb()/rgba() fuera de la definición de tokens", (file, text) => {
    const found = hardcodedColors(text);
    expect(found, `${file}: ${found.length} colores fijos; usá var(--token) en lugar del valor`).toEqual([]);
  });
});

describe("tokens de diseño en app/globals.css", () => {
  it("encuentra los bloques que usa el resto de la prueba", () => {
    const failures: string[] = [];
    if (root.size === 0) failures.push("no hay bloque :root con variables");
    if (darkMedia.size === 0) failures.push('no hay bloque :root dentro de @media (prefers-color-scheme: dark)');
    if (darkAttr.size === 0) failures.push('no hay bloque :root[data-theme="oscuro"]');
    if (theme.size === 0) failures.push("no hay bloque @theme");
    expect(failures).toEqual([]);
  });

  it("define cada color en el tema claro y en los dos bloques oscuros, con su entrada en @theme", () => {
    const failures: string[] = [];
    for (const { name, value } of tokens.color.tokens) {
      expectValue(failures, root, `--${name}`, value.claro, ":root", `token de color "${name}" claro`);
      expectValue(failures, darkMedia, `--${name}`, value.oscuro, "@media (prefers-color-scheme: dark)", `token de color "${name}" oscuro`);
      expectValue(failures, darkAttr, `--${name}`, value.oscuro, ':root[data-theme="oscuro"]', `token de color "${name}" oscuro`);
      expectValue(failures, theme, `--color-${name}`, `var(--${name})`, "@theme", `entrada de color "${name}"`);
    }
    expect(failures).toEqual([]);
  });

  it("define cada espacio como variable y como entrada --spacing-* en @theme", () => {
    const failures: string[] = [];
    for (const { name, value } of tokens.spacing.tokens) {
      expectValue(failures, root, `--${name}`, value, ":root", `token de espacio "${name}"`);
      expectEntry(failures, `--spacing-${name}`, `espacio "${name}"`);
    }
    expect(failures).toEqual([]);
  });

  it("define cada radio en @theme con su valor", () => {
    const failures: string[] = [];
    for (const { name, value } of tokens.radius.tokens) {
      expectValue(failures, theme, `--${name}`, value, "@theme", `token de radio "${name}"`);
    }
    expect(failures).toEqual([]);
  });

  it("define cada sombra en claro y oscuro, con su entrada --shadow-* en @theme", () => {
    const failures: string[] = [];
    for (const { name, value } of tokens.shadow.tokens) {
      expectValue(failures, root, `--${name}`, value.claro, ":root", `token de sombra "${name}" claro`);
      expectValue(failures, darkMedia, `--${name}`, value.oscuro, "@media (prefers-color-scheme: dark)", `token de sombra "${name}" oscuro`);
      expectValue(failures, darkAttr, `--${name}`, value.oscuro, ':root[data-theme="oscuro"]', `token de sombra "${name}" oscuro`);
      expectEntry(failures, `--shadow-${name}`, `sombra "${name}"`);
    }
    expect(failures).toEqual([]);
  });

  it("define cada estilo tipográfico con --text-* en @theme", () => {
    const failures: string[] = [];
    for (const group of tokens.type.groups) {
      for (const style of group.styles) {
        const base = `--text-${style.name}`;
        const where = "@theme";
        const what = `estilo tipográfico "${style.name}"`;
        expectValue(failures, theme, base, style.fontSize, where, `${what} (tamaño)`);
        expectValue(failures, theme, `${base}--line-height`, style.lineHeight, where, `${what} (interlineado)`);
        expectValue(failures, theme, `${base}--font-weight`, String(style.fontWeight), where, `${what} (peso)`);
        if (style.letterSpacing !== undefined) {
          expectValue(failures, theme, `${base}--letter-spacing`, style.letterSpacing, where, `${what} (espaciado entre letras)`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("declara las familias --font-display y --font-sans-uj sin redefinir --font-sans", () => {
    const failures: string[] = [];
    expectEntry(failures, "--font-display", "familia de titulares");
    expectEntry(failures, "--font-sans-uj", "familia de texto");
    if (theme.has("--font-sans")) failures.push("@theme no debe redefinir --font-sans de Tailwind");
    expect(failures).toEqual([]);
  });
});
