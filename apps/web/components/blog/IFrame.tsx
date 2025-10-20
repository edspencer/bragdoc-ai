'use client';

import { useRef } from 'react';
import Link from 'next/link';

export default function IFrame({ src }: { src: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const handleRefresh = () => {
    if (iframeRef.current) {
      const timestamp = Date.now();
      iframeRef.current.src = `${src}${src.includes('?') ? '&' : '?'}_t=${timestamp}`;
    }
  };

  return (
    <figure className="my-6">
      <div className="flex items-center justify-end mb-1">
        <button
          type="button"
          className="text-slate-500 hover:text-slate-800 focus:outline-none"
          onClick={handleRefresh}
          title="Refresh"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      </div>
      <iframe
        title={src}
        ref={iframeRef}
        src={src}
        className="h-96 w-full rounded-md border border-slate-500"
      />
      <figcaption className="text-center text-sm italic text-slate-500 pt-2">
        This is an iframe pointing to{' '}
        <Link target="_blank" href={src}>
          {src}
        </Link>
      </figcaption>
    </figure>
  );
}
