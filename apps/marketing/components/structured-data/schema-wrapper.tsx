interface SchemaWrapperProps {
  schema: object;
}

export function SchemaWrapper({ schema }: SchemaWrapperProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
