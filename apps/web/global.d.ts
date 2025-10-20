import React from 'react';

type CustomHTMLProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
>;

// Define any custom tags you want to permit for your LLM prompts here
type CustomTags =
  | 'companies'
  | 'company'
  | 'projects'
  | 'project'
  | 'name'
  | 'role'
  | 'description'
  | 'status'
  | 'title'
  | 'doctitle'
  | 'today'
  | 'user-instructions'
  | 'id'
  | 'start-date'
  | 'end-date'
  | 'remote-repo-url'
  | 'user-input'
  | 'repository'
  | 'commit'
  | 'hash'
  | 'message'
  | 'author'
  | 'date'
  | 'expected-achievements'
  | 'extracted-achievements'
  | 'achievement-source'
  | 'company-id'
  | 'background'
  | 'chat-history'
  | 'language'
  | 'days'
  | 'achievement'
  | 'achievements'
  | 'impact'
  | 'details'
  | 'summary'
  | 'result'
  | 'actual'
  | 'expected'
  | 'document-title'
  | 'achievement-title'
  | 'event-start'
  | 'event-end'
  | 'generated-document'
  | 'event-duration'
  | 'remote-url';

//adds all the custom tags to the JSX namespace
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends Record<CustomTags, CustomHTMLProps> {}
  }
}