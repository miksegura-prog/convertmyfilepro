import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items?: FAQItem[];
}

export const FAQ: React.FC<FAQProps> = ({ items }) => {
  const { t } = useTranslation();

  const defaultFAQs: FAQItem[] = [
    {
      question: t('faq.secure.question'),
      answer: t('faq.secure.answer')
    },
    {
      question: t('faq.free.question'),
      answer: t('faq.free.answer')
    },
    {
      question: t('faq.limits.question'),
      answer: t('faq.limits.answer')
    },
    {
      question: t('faq.quality.question'),
      answer: t('faq.quality.answer')
    }
  ];

  const faqs = items || defaultFAQs;

  return (
    <section className="py-12">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-[var(--color-text)] mb-8">
          {t('faq.title')}
        </h2>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white dark:bg-[var(--color-card)] 
                       border border-[var(--color-border)] rounded-xl px-6
                       data-[state=open]:shadow-md transition-shadow"
            >
              <AccordionTrigger className="text-left text-[var(--color-text)] 
                                         hover:no-underline py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-[var(--color-muted)] pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
