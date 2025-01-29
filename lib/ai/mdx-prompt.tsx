import * as Elements from './prompts/elements';

import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeFormat from 'rehype-format';
import rehypeStringify from 'rehype-stringify';

// Custom components to inject into MDX via MDXProvider-like approach
export const Components = {
  ...Elements,
  p: (props: any) => props.children,
  ul: (props: any) => props.children,
  ol: (props: any) => props.children,
  li: (props: any) => '- ' + props.children,
};

// A helper that uses rehype-format to pretty-print the final HTML
export function prettyHtml(rawHtml: string): string {
  const file = unified()
    // parse as an “HTML fragment”
    .use(rehypeParse, { fragment: true })
    // apply standard formatting rules
    .use(rehypeFormat)
    // serialize back to HTML
    .use(rehypeStringify)
    .processSync(rawHtml);

  return String(file);
}

import fs from 'fs';
import { compileMDX } from 'next-mdx-remote/rsc';

export async function compileMDXPromptFile(filePath: string, data?: any) {
  const mdxSource = fs.readFileSync(filePath, 'utf-8');

  const { content } = await compileMDX({
    source: mdxSource,
    components: Components,
    options: {
      scope: {
        data,
      },
    },
  });

  return content;
}

export async function renderCompiledMDXSource(
  mdxSource: React.ReactElement,
  renderFn: Function
) {
  return prettyHtml(renderFn(mdxSource));
}

export interface RenderOptions {
  renderFn: Function;
  filePath: string;
  data?: any;
}

export async function renderMDXPromptFile(options: RenderOptions) {
  const { renderFn, filePath, data } = options;

  const content = await compileMDXPromptFile(filePath, data);

  return renderCompiledMDXSource(content, renderFn);
}
