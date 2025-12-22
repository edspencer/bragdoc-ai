'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';
import type { EditableFieldGroupProps } from './types';

/**
 * Editable field group component with auto-expanding textareas.
 *
 * Each field has:
 * - Associated label for accessibility
 * - Auto-expanding textarea (grows with content)
 * - Consistent styling matching the original static design
 */
export function EditableFieldGroup({
  title,
  fields,
  sectionKey,
  groupKey,
  values,
  onChange,
}: EditableFieldGroupProps) {
  const baseId = useId();

  return (
    <div className="bg-white/60 dark:bg-black/20 print:bg-white rounded-lg p-4 print:border print:border-gray-200">
      <h3 className="font-semibold text-gray-800 dark:text-white print:text-gray-800 mb-3 text-sm uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-3">
        {fields.map((field) => {
          const fieldPath = `${sectionKey}.${groupKey}.${field.key}`;
          const fieldId = `${baseId}-${field.key}`;
          const value = values[field.key] || '';

          return (
            <div key={field.key} className="flex flex-col gap-1">
              <label
                htmlFor={fieldId}
                className="text-gray-500 dark:text-gray-400 print:text-gray-500 text-sm font-medium"
              >
                {field.label}:
              </label>
              <textarea
                id={fieldId}
                value={value}
                onChange={(e) => onChange(fieldPath, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                className={cn(
                  'w-full min-h-[2.5rem] px-2 py-1.5 text-sm',
                  'bg-transparent border-b border-gray-300 dark:border-gray-600 print:border-gray-400',
                  'focus:outline-none focus:border-blue-500 dark:focus:border-blue-400',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'resize-none overflow-hidden',
                  'text-gray-900 dark:text-white print:text-gray-900',
                  // Auto-expand with content - modern CSS approach
                  'field-sizing-content',
                )}
                rows={1}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
