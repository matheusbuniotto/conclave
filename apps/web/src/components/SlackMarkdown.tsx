import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, ExternalLink } from "lucide-react";

interface SlackMarkdownProps {
  content: string;
  className?: string;
}

// Convert Slack mrkdwn tags, mentions, and channel links
function preprocessSlackMrkdwn(text: string): string {
  if (!text) return "";

  // 1. Convert Slack links: <http://example.com|Label> -> [Label](http://example.com)
  let processed = text.replace(/<([^|>]+)\|([^>]+)>/g, "[$2]($1)");

  // 2. Convert bare Slack links: <http://example.com> -> [http://example.com](http://example.com)
  processed = processed.replace(/<(https?:\/\/[^>]+)>/g, "[$1]($1)");

  // 3. Highlight mentions (@name) and channels (#channel) when outside code spans
  const parts = processed.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  for (let i = 0; i < parts.length; i++) {
    // Only process text outside of code
    if (parts[i] && !parts[i].startsWith("`")) {
      // Mentions: @username
      parts[i] = parts[i].replace(/(^|\s)@([a-zA-Z0-9_\-]+)/g, "$1[@$2](#mention)");
      // Channels: #channel-name
      parts[i] = parts[i].replace(/(^|\s)#([a-zA-Z0-9_\-]+)/g, "$1[#$2](#channel)");
    }
  }

  return parts.join("");
}

// Code block component with language tag and Copy button
const CodeBlock: React.FC<{
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children || "").replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Inline code snippet like Slack mrkdwn
  if (inline || (!className && !codeString.includes("\n"))) {
    return (
      <code
        className="px-1.5 py-0.5 rounded text-[12px] font-mono bg-zinc-100 text-[#e01e5a] border border-zinc-200/70"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Multi-line fenced code block like Slack
  return (
    <div className="relative group my-2.5 rounded-lg overflow-hidden border border-zinc-800 bg-[#18181b] shadow-2xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#121214] border-b border-zinc-800/80 text-zinc-400 text-[11px] font-mono select-none">
        <span className="uppercase font-medium text-zinc-400 tracking-wider">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors py-0.5 px-1.5 rounded hover:bg-zinc-800"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3.5 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-zinc-200">
        <pre className="m-0 p-0 bg-transparent font-mono">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
};

export const SlackMarkdown: React.FC<SlackMarkdownProps> = ({ content, className = "" }) => {
  const processed = preprocessSlackMrkdwn(content);

  return (
    <div className={`slack-markdown text-[13px] leading-relaxed text-zinc-800 break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock as any,
          p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
          a: ({ href, children }) => {
            if (href === "#mention") {
              return (
                <span className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded text-[11.5px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 select-none">
                  {children}
                </span>
              );
            }
            if (href === "#channel") {
              return (
                <span className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded text-[11.5px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/70 select-none">
                  {children}
                </span>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline font-normal inline-flex items-center gap-0.5"
              >
                <span>{children}</span>
                <ExternalLink size={10} className="inline opacity-60 ml-0.5" />
              </a>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-zinc-300 pl-3 my-2 text-zinc-600 italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-1.5 ml-1 text-zinc-800">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-1.5 ml-1 text-zinc-800">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-[15px] font-bold text-zinc-900 mt-2.5 mb-1 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[14px] font-bold text-zinc-900 mt-2 mb-1 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[13px] font-semibold text-zinc-900 mt-1.5 mb-0.5 tracking-tight">
              {children}
            </h3>
          ),
          hr: () => <hr className="my-2.5 border-zinc-200" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 border border-zinc-200 rounded-lg">
              <table className="min-w-full divide-y divide-zinc-200 text-xs text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-50 font-semibold text-zinc-700">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-zinc-200 bg-white">{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 font-semibold text-zinc-700">{children}</th>,
          td: ({ children }) => <td className="px-3 py-1.5 text-zinc-600">{children}</td>,
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
};
