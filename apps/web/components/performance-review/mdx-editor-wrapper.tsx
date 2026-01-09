'use client';

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  ListsToggle,
  CreateLink,
  BlockTypeSelect,
  UndoRedo,
  Separator,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { forwardRef } from 'react';

interface MDXEditorWrapperProps {
  markdown: string;
  onChange?: (markdown: string) => void;
  readOnly?: boolean;
  className?: string;
}

export const MDXEditorWrapper = forwardRef<
  MDXEditorMethods,
  MDXEditorWrapperProps
>(({ markdown, onChange, readOnly = false, className }, ref) => {
  return (
    <MDXEditor
      ref={ref}
      markdown={markdown}
      onChange={onChange}
      readOnly={readOnly}
      className={className}
      contentEditableClassName="prose prose-sm dark:prose-invert max-w-none min-h-[400px] focus:outline-none"
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        linkPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <BoldItalicUnderlineToggles />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
            </>
          ),
        }),
      ]}
    />
  );
});

MDXEditorWrapper.displayName = 'MDXEditorWrapper';
