import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Question {
  question: string;
  answer: string;
}

interface FaqCategoryProps {
  title: string;
  questions: Question[];
}

export function FaqCategory({ title, questions }: FaqCategoryProps) {
  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6 text-foreground">{title}</h2>
      <Accordion type="single" collapsible className="space-y-2">
        {questions.map((item, index) => (
          <AccordionItem
            key={index}
            value={`${title}-${index}`}
            className="border border-border rounded-lg px-6 bg-card"
          >
            <AccordionTrigger className="text-left hover:no-underline py-4">
              <span className="font-medium text-foreground">
                {item.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground pb-4">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
