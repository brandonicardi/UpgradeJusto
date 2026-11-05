import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Sin rehype-raw: el HTML crudo del modelo se escapa y se ve como texto.
// Las imágenes remotas no se cargan; los enlaces javascript: los descarta urlTransform por defecto.
const components: Components = {
  a: ({ node, href, children }) => { void node; return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>; },
  table: ({ node, children }) => { void node; return <div className="table-scroll"><table className="admin-table">{children}</table></div>; },
};

export default function Markdown({ content }: { content: string }) {
  return <div className="message-content"><ReactMarkdown remarkPlugins={[remarkGfm]} components={components} disallowedElements={["img"]}>{content}</ReactMarkdown></div>;
}
