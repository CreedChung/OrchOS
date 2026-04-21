import ReactMarkdown from "react-markdown";

import { ChatCodeBlock } from "@/components/chat/ChatCodeBlock";

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-inherit dark:prose-invert prose-headings:mb-2 prose-headings:mt-5 prose-headings:text-inherit prose-headings:font-semibold prose-p:my-2 prose-p:text-inherit prose-p:leading-7 prose-li:my-1 prose-li:text-inherit prose-strong:text-inherit prose-code:rounded-md prose-code:bg-black/6 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.8rem] prose-code:text-inherit prose-code:before:content-none prose-code:after:content-none prose-pre:bg-transparent prose-pre:p-0 prose-blockquote:border-l-border prose-blockquote:text-inherit prose-hr:border-border/70 prose-a:font-medium prose-a:text-primary prose-a:no-underline hover:prose-a:underline dark:prose-code:bg-white/8">
      <ReactMarkdown
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              className="font-medium text-primary underline-offset-4 hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            />
          ),
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-([\w-]+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");

            if (!inline) {
              return <ChatCodeBlock code={code} language={match?.[1]} />;
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
