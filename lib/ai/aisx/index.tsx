import React from 'react';
import { Code } from 'bright';

Code.theme = 'github-light';

const { renderToStaticMarkup } = await import('react-dom/server');

function formatXML(xml: string): string {
  let formatted = '';
  let indent = '';
  const tab = '  '; // 2 spaces for indentation

  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) {
      // Closing tag
      indent = indent.substring(tab.length);
    }
    formatted += indent + '<' + node + '>\n';
    if (node.match(/^<?\w[^>]*[^\/]$/)) {
      // Opening tag
      indent += tab;
    }
  });

  return formatted.substring(1, formatted.length - 2);
}

export function Prompt({ children }: { children: React.ReactNode }) {
  // Convert the <prompt>…</prompt> element to a static XML string
  const xmlString = formatXML(renderToStaticMarkup(<>{children}</>));
  // Then render that as plain text instead of letting React treat it as DOM
  return (
    <Code lang="xml" className="text-sm">
      {xmlString}
    </Code>
  );
}

export function Purpose({ children }: { children: React.ReactNode }) {
  return <purpose>{children}</purpose>;
}

export function Variables({ children }: { children: React.ReactNode }) {
  return <variables>{children}</variables>;
}

export function Instructions({
  instructions = [],
  children,
}: {
  instructions?: string[];
  children?: React.ReactNode;
}) {
  return (
    <instructions>
      {instructions.map((instruction) => (
        <Instruction key={instruction.replace(/\s/g, '')}>
          {instruction}
        </Instruction>
      ))}
      {children}
    </instructions>
  );
}

export function Instruction({ children }: { children: React.ReactNode }) {
  return <instruction>{children}</instruction>;
}

export function UserInput({ children }: { children: React.ReactNode }) {
  return <user-input>{children}</user-input>;
}

export function Example({ children }: { children: React.ReactNode }) {
  return <example>{children}</example>;
}

export function Examples({
  examples = [],
  children,
}: {
  examples?: string[];
  children?: React.ReactNode;
}) {
  return (
    <examples>
      {examples?.map((example, index) => (
        <Example key={index}>{example}</Example>
      ))}
      {children}
    </examples>
  );
}

export function InputFormat({
  children,
  title = 'You are provided with the following inputs:',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return <input-format title={title}>{children}</input-format>;
}

export function ChatHistory({ messages }: { messages: any[] }) {
  return (
    <chat-history>
      {messages.map(({ role, content }) => (
        <message key={content.replace(/\s/g, '')}>
          {role}: {content}
        </message>
      ))}
    </chat-history>
  );
}
