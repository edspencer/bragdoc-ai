//this is now vestigial, but it works well enough any may be useful in the future

import { serialize } from 'next-mdx-remote/serialize';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Components, prettyHtml } from './mdx-prompt'; // your custom stuff
import { MDXRemote } from 'next-mdx-remote';

// A helper to compile and run MDX purely in Node
export async function renderMDXFile(
  mdxSource: string,
  data: Record<string, any> = {}
): Promise<string> {
  // 3) Serialize the MDX (compile it to next-mdx-remote format)
  const mdxCompiled = await serialize(mdxSource, {
    parseFrontmatter: true,
    scope: { data },
    // Optionally pass mdxOptions, e.g. remarkPlugins, rehypePlugins, etc.
  });

  // 4) Render to static HTML using <MDXRemote>
  // We can pass our custom MDX components or none at all.
  const html = renderToStaticMarkup(
    <MDXRemote {...mdxCompiled} components={Components} />
  );

  return prettyHtml(html);
}
