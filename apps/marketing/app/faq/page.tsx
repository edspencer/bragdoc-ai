import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FaqHeader } from '@/components/faq/faq-header';
import { FaqCategory } from '@/components/faq/faq-category';
import { FaqCta } from '@/components/faq/faq-cta';
import { FAQSchema } from '@/components/structured-data/faq-schema';
import { faqData } from '@/lib/faq-data';

export const metadata: Metadata = {
  title:
    'BragDoc FAQ: Pricing, Privacy, Setup & Features - All Your Questions Answered',
  description:
    'Answers to common questions about BragDoc: How does it work? Is it free? Is my code safe? Setup instructions, LLM configuration, privacy details, and more.',
  keywords:
    'bragdoc faq, bragdoc questions, how to use bragdoc, is bragdoc safe, bragdoc pricing',
};

export default function FaqPage() {
  // Flatten all questions for schema
  const allQuestions = faqData.flatMap((category) => category.questions);

  return (
    <div className="min-h-screen bg-background">
      <FAQSchema faqs={allQuestions} />
      <Header />
      <main className="pt-16">
        <FaqHeader />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-4xl">
          {faqData.map((category) => (
            <FaqCategory
              key={category.category}
              title={category.category}
              questions={category.questions}
            />
          ))}
        </div>

        <FaqCta />
      </main>
      <Footer />
    </div>
  );
}
