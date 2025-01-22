import { Code } from 'bright';
import { formatXML } from 'jsx-prompt';

Code.theme = 'github-light';

export async function PrettyPrompt({
  children,
}: {
  children: React.ReactNode;
}) {
  const ReactDOMServer = (await import('react-dom/server')).default;

  return (
    <Code lang="xml">
      {formatXML(ReactDOMServer.renderToStaticMarkup(children))}
    </Code>
  );
}
