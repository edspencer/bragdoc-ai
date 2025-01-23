import { setRenderFunction } from 'jsx-prompt';

// Gives jsx-prompt the right version of renderToStaticMarkup
(async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  setRenderFunction(renderToStaticMarkup);
})();