import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const mdComponents = {
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold text-gray-900 mt-4 mb-2 first:mt-0 tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-gray-900 mt-3 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="text-[13px] sm:text-sm leading-relaxed text-gray-800 mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 ml-1 space-y-1 list-disc pl-4 marker:text-gray-400">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-1 space-y-1 list-decimal pl-4 marker:text-gray-500">{children}</ol>,
  li: ({ children }) => <li className="text-[13px] sm:text-sm leading-relaxed text-gray-800 pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
  code: ({ className, children, ...props }) => {
    const isFenced = Boolean(className?.match(/language-/));
    if (isFenced) {
      return (
        <code
          className={`block text-xs font-mono bg-gray-100 text-gray-800 rounded-xl px-3 py-2.5 my-2 overflow-x-auto border border-gray-200/80 ${className || ''}`}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className="text-[12px] font-mono bg-gray-100/90 text-slate-800 px-1.5 py-0.5 rounded-md"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-xl bg-transparent p-0 font-sans">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-blue-200 pl-3 my-2 text-gray-600 italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-100/80">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-gray-800">{children}</td>,
};

/**
 * Renders assistant markdown (headings, lists, bold, etc.) like ChatGPT.
 */
export function ChatMarkdown({ children }) {
  const text = typeof children === 'string' ? children : '';
  return (
    <div className="chat-markdown prose-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
