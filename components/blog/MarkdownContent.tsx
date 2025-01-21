import remarkGfm from 'remark-gfm';

//generic components shared between posts
import Aside from './Aside';
import Video from './Video';
import Quote from './Quote';
import Figure from './Figure';
import IFrame from './IFrame';
import Table, { TableRow, TableCell } from './Table';
import CaptionedContent from './CaptionedContent';

import { Code } from 'bright';
import { MDXRemote } from 'next-mdx-remote/rsc';

Code.theme = 'github-light';

// Code.defaultProps = {
//   lang: 'shell',
// };

const mdxOptions = {
  remarkPlugins: [remarkGfm], //adds support for tables
  rehypePlugins: [],
};

const components = {
  pre: Code,
  Aside,
  Video,
  Quote,
  Figure,
  Table,
  IFrame,
  TableRow,
  TableCell,
  CaptionedContent,

  //just colors any `inline code stuff` blue
  code: (props: any) => (
    <code style={{ color: 'rgb(0, 92, 197)' }} {...props} />
  ),
};

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <MDXRemote
      options={{ mdxOptions }}
      source={content}
      components={components}
    />
  );
}
