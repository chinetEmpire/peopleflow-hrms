'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FadeIn, StaggerItem } from './animations';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'Is this platform only for large companies?',
    answer: 'No. It is specifically built for small and medium-sized businesses. Whether you run a startup, a school, an NGO, or a growing company, our platform is designed for you.',
  },
  {
    question: 'Can I use it with only 10 employees?',
    answer: 'Absolutely. Whether you have 5 employees or 500 employees, the platform works perfectly. Start free and scale as you grow.',
  },
  {
    question: 'Can employees access it themselves?',
    answer: 'Yes. Employees have their own secure portal where they can manage their information, request leave, download documents, and access company information without contacting HR.',
  },
  {
    question: 'Is my company data secure?',
    answer: 'Yes. Your information is stored securely with modern encryption and regular backups. We use industry-standard security practices to protect your data.',
  },
  {
    question: 'Can I access it from my phone?',
    answer: 'Yes. The platform works on mobile phones, tablets, and desktop computers. Manage your HR from anywhere.',
  },
  {
    question: 'How long does setup take?',
    answer: 'Most businesses are fully operational within a few hours. Import your employees, set up your departments, and start managing your workforce the same day.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-white"
      >
        <span className="text-base font-medium text-white pr-4">{question}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300',
            open && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          open ? 'max-h-40 pb-5' : 'max-h-0'
        )}
      >
        <p className="text-slate-300 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function FAQSection() {
  return (
    <section className="py-20 sm:py-28 bg-[#020316] text-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#60a5fa] mb-3">
              FAQ
            </p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
        </FadeIn>

        <StaggerItem>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </StaggerItem>
      </div>
    </section>
  );
}
