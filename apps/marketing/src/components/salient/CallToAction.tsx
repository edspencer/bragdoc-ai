import { Button } from './Button';
import { Container } from './Container';

export function CallToAction() {
  return (
    <section
      id="get-started-today"
      className="relative overflow-hidden bg-blue-600 py-32"
    >
      <Container className="relative">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
            Get started today
          </h2>
          <p className="mt-4 text-lg tracking-tight text-white">
            It&apos;s time to take control of your career narrative. Start
            tracking your achievements with bragdoc.ai and never miss a win.
          </p>
          <Button href="/register" color="white" className="mt-10">
            Get started for free
          </Button>
        </div>
      </Container>
    </section>
  );
}
