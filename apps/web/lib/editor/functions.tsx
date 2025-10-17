'use client';

import { defaultMarkdownSerializer } from 'prosemirror-markdown';
import { DOMParser, type Node } from 'prosemirror-model';
import { renderToString } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';

import { documentSchema } from './config';

export const buildDocumentFromContent = (content: string) => {
  const parser = DOMParser.fromSchema(documentSchema);
  const stringFromMarkdown = renderToString(
    <ReactMarkdown>{content}</ReactMarkdown>,
  );
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = stringFromMarkdown;
  return parser.parse(tempContainer);
};

export const buildContentFromDocument = (document: Node) => {
  return defaultMarkdownSerializer.serialize(document);
};
