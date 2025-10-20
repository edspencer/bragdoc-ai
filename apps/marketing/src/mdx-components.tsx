import type { MDXComponents } from 'mdx/types';
// import { Code } from 'bright';

// Code.theme = {
//   dark: 'github-dark',
//   light: 'github-light',
// };

// Code.theme = 'github-dark';

// Code.defaultProps = {
//   lang: 'shell',
// };

// Marketing app doesn't need AI prompt components
import { htmlComponents } from 'mdx-prompt/components/html';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    ...htmlComponents,
    // pre: Code,

    //just colors any `inline code stuff` blue
    code: (props: any) => (
      <code style={{ color: 'rgb(0, 92, 197)' }} {...props} />
    ),
  };
}
