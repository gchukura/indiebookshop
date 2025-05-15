import React, { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SchemaOrg } from "./SchemaOrg";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  description?: string;
  faqs: FAQItem[];
  className?: string;
}

/**
 * A FAQ section component that displays a list of questions and answers
 * with accordion functionality and Schema.org FAQ structured data
 */
const FAQSection: React.FC<FAQSectionProps> = ({
  title = "Frequently Asked Questions",
  description,
  faqs,
  className = "",
}) => {
  const [openItems, setOpenItems] = useState<string[]>([]);

  // Generate unique IDs for accordion items
  const faqsWithIds = faqs.map((faq, index) => ({
    ...faq,
    id: `faq-${index}`,
  }));

  // Prepare schema data for the FAQ
  const faqSchema = {
    type: 'faq' as const,
    questions: faqs
  };

  return (
    <div className={`my-8 ${className}`}>
      {/* SEO-friendly schema markup */}
      <SchemaOrg schema={faqSchema} />

      {/* FAQ section heading */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2A6B7C]">
          {title}
        </h2>
        {description && (
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
            {description}
          </p>
        )}
      </div>

      {/* FAQ accordion */}
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-4 md:p-6">
        <Accordion
          type="multiple"
          value={openItems}
          onValueChange={setOpenItems}
          className="space-y-4"
        >
          {faqsWithIds.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="border border-gray-200 rounded-md overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 font-medium text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 text-gray-600">
                <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default FAQSection;