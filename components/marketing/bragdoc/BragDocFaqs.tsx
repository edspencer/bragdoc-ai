import { Container } from '@/components/marketing/salient/Container';

const faqs = [
  {
    question: 'What exactly is a brag document?',
    answer:
      'A brag document is a personal record of your professional achievements, projects, and impact. It helps you track your contributions and growth over time, making it easier to prepare for performance reviews, job interviews, or promotion discussions.',
  },
  {
    question: 'How often should I update my brag document?',
    answer:
      'We recommend updating your brag document regularly, ideally weekly or bi-weekly. With bragdoc.ai, our AI assistant helps you capture achievements in real-time through natural conversations, making it effortless to maintain an up-to-date record.',
  },
  {
    question: 'Is this just for software engineers?',
    answer:
      "Not at all! Brag documents are valuable for professionals across all industries and roles. Whether you're in engineering, design, product management, marketing, or any other field, tracking your achievements helps demonstrate your value and growth.",
  },
  {
    question: 'How is this different from a resume?',
    answer:
      'While a resume is a curated highlight reel, a brag document is a comprehensive record of all your achievements, including smaller wins and ongoing projects. It serves as a source of truth from which you can pull information for resumes, reviews, or any other professional needs.',
  },
  {
    question: 'Can I import my existing achievements?',
    answer:
      'Yes! You can easily import existing achievements through our chat interface or by connecting your GitHub account. Our AI assistant will help organize and enhance your existing records with additional context and details.',
  },
  {
    question: 'How secure is my data?',
    answer:
      'We take data security seriously. Your brag document is encrypted and stored securely, visible only to you. You can control sharing settings and export your data at any time.',
  },
];

export function BragDocFaqs() {
  return (
    <section id="faqs" aria-labelledby="faqs-title" className="py-20 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2
            id="faqs-title"
            className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl"
          >
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            If you can&apos;t find what you&apos;re looking for, feel free to{' '}
            <a
              href="mailto:support@bragdoc.ai"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              email our support team
            </a>
            .
          </p>
        </div>
        <ul className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-2">
          {faqs.map((faq, faqIndex) => (
            <li key={faqIndex}>
              <h3 className="font-display text-lg leading-7 text-slate-900 dark:text-slate-100">
                {faq.question}
              </h3>
              <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
                {faq.answer}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
