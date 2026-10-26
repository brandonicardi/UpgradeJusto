import { Fragment } from "react";
import { inlineParts, messageBlocks } from "../lib/message-presentation";

function Inline({ text }: { text: string }) {
  return <>{inlineParts(text).map((part, index) => part.bold ? <strong key={index}>{part.text}</strong> : <Fragment key={index}>{part.text}</Fragment>)}</>;
}
export default function MessageRender({ content }: { content: string }) {
  return <div className="message-content">{messageBlocks(content).map((block, index) => {
    if (block.kind === "table") return <div key={index} className="message-table" aria-label="Información organizada por tema">{block.rows.length ? block.rows.map((row, ri) => <dl key={ri} className="message-table-row">{Array.from({ length: Math.max(block.headers.length, row.length) }, (_, ci) => <div key={ci}><dt><Inline text={block.headers[ci] || `Detalle ${ci + 1}`} /></dt><dd><Inline text={row[ci] ?? "Sin dato en esta fila"} /></dd></div>)}</dl>) : <p><Inline text={block.headers.join(" · ")} /></p>}</div>;
    if (block.kind === "list") {
      const items = block.items.map((item, li) => <li key={li} value={block.ordered ? item.number : undefined}><Inline text={item.text} /></li>);
      return block.ordered ? <ol key={index} start={block.items[0]?.number}>{items}</ol> : <ul key={index}>{items}</ul>;
    }
    return block.kind === "literal" ? <pre key={index} className="message-literal">{block.text}</pre> : <p key={index}><Inline text={block.text} /></p>;
  })}</div>;
}
