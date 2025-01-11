import type { MDXComponents } from 'mdx/types';
import { Code } from 'bright';

// Code.theme = {
//   dark: 'github-dark',
//   light: 'github-light',
// };

Code.theme = 'github-dark';

Code.defaultProps = {
  lang: 'shell',
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: Code,

    //just colors any `inline code stuff` blue
    code: (props: any) => (
      <code style={{ color: 'rgb(0, 92, 197)' }} {...props} />
    ),
  };
}
