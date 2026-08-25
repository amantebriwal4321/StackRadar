"use client";

import { Accordion, AccordionItem } from "@/components/ui/accordion";

/**
 * FAQ list for the /learn/[slug] SEO guides.
 *
 * Exists because that page is an async SERVER component (it also emits the
 * FAQPage JSON-LD from this same data), so the interactive open/close state has
 * to live in a client child. The accordion keeps every answer mounted, so the
 * answer text still ships in the SSR HTML that the rich result depends on.
 */
export default function FaqAccordion({
  faqs,
}: {
  faqs: { q: string; a: string }[];
}) {
  return (
    <Accordion className="space-y-3">
      {faqs.map((f, i) => (
        <AccordionItem
          key={f.q}
          id={`faq-${i}`}
          className="tech-panel tech-panel-interactive rounded-xl p-5"
          headerClassName="font-bold text-[var(--c-ink)]"
          header={f.q}
          icon="plus"
        >
          <p className="text-sm text-[var(--c-ink-2)] font-light leading-relaxed pt-3">
            {f.a}
          </p>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
