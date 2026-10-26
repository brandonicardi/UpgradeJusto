export type MessageBlock =
  | { kind: "paragraph" | "literal"; text: string }
  | { kind: "list"; ordered: boolean; items: { text: string; number?: number }[] }
  | { kind: "table"; headers: string[]; rows: string[][] };

export function inlineParts(text: string): { text: string; bold: boolean }[] {
  return text.split(/(\*\*[^*\n]+\*\*|__[^_\n]+__)/g).filter(Boolean).map(part => {
    const bold = part.length > 4 && ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__")));
    return { text: bold ? part.slice(2, -2) : part, bold };
  });
}
function cells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return trimmed.split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, "|"));
}
function tableStart(lines: string[], index: number): boolean {
  return lines[index].includes("|") && !!lines[index + 1]?.includes("|") && cells(lines[index + 1]).every(cell => /^:?-{3,}:?$/.test(cell));
}
function listItem(line: string) {
  const match = /^([-*+]|\d+[.)])\s+(.+)$/.exec(line);
  return match ? { text: match[2], ordered: /^\d/.test(match[1]), number: /^\d/.test(match[1]) ? Number.parseInt(match[1], 10) : undefined } : null;
}
export function messageBlocks(content: string): MessageBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n"), blocks: MessageBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].trim()) { index++; continue; }
    if (/^(```|~~~)/.test(lines[index])) {
      const fence = lines[index].slice(0, 3), literal = [lines[index++]];
      while (index < lines.length) { const line = lines[index++]; literal.push(line); if (line.startsWith(fence)) break; }
      blocks.push({ kind: "literal", text: literal.join("\n") }); continue;
    }
    if (tableStart(lines, index)) {
      const headers = cells(lines[index]); index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) rows.push(cells(lines[index++]));
      // No row data is discarded, including extra cells or an incomplete last row.
      blocks.push({ kind: "table", headers, rows }); continue;
    }
    const first = listItem(lines[index]);
    if (first) {
      const items: { text: string; number?: number }[] = [];
      while (index < lines.length) {
        const item = listItem(lines[index]); if (!item || item.ordered !== first.ordered) break;
        items.push({ text: item.text, number: item.number }); index++;
      }
      blocks.push({ kind: "list", ordered: first.ordered, items }); continue;
    }
    const paragraph = [lines[index++]];
    while (index < lines.length && lines[index].trim() && !tableStart(lines, index) && !listItem(lines[index]) && !/^(```|~~~)/.test(lines[index])) paragraph.push(lines[index++]);
    blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
  }
  return blocks;
}
export const normalizeMessageText = (value: string) => value.replace(/\s+/g, " ").trim();
export function messageTextFragments(content: string): string[] {
  const plain = (text: string) => normalizeMessageText(inlineParts(text).map(part => part.text).join(""));
  return messageBlocks(content).flatMap(block => block.kind === "table" ? [...block.headers, ...block.rows.flat()].map(plain) : block.kind === "list" ? block.items.map(item => plain(item.text)) : [block.kind === "literal" ? normalizeMessageText(block.text) : plain(block.text)]).filter(Boolean);
}
