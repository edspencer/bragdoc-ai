import type { renderToStaticMarkup as _renderToStaticMarkup } from 'react-dom/server'

export let renderToStaticMarkup: typeof _renderToStaticMarkup
import('react-dom/server').then((module) => {
  console.log('boo')
  renderToStaticMarkup = module.renderToStaticMarkup
})