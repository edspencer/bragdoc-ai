import React from 'react'
import { renderToString } from 'react-dom/server'

export function formattedRender(children: React.ReactNode): string {
  return formatXML(renderToString(children))
}

export function formatXML(xml: string): string {
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