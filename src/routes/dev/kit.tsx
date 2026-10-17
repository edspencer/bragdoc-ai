// /dev/kit: the component kit's showcase (src/dev/Kit.tsx). It exists in dev and BRAGDOC_KIT=1 builds only: in a
// release build __BRAGDOC_KIT__ is false, so the import below is dead code that the bundler drops, and the route is
// the not-found page (D23).
import { Suspense, lazy } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';

const Kit = __BRAGDOC_KIT__ ? lazy(() => import('../../dev/Kit.tsx').then((m) => ({ default: m.Kit }))) : null;

export const Route = createFileRoute('/dev/kit')({
  beforeLoad: () => {
    if (!Kit) throw notFound();
  },
  component: KitPage,
});

function KitPage() {
  return Kit ? (
    <Suspense fallback={null}>
      <Kit />
    </Suspense>
  ) : null;
}
