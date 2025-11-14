import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SchemaOrg } from "./SchemaOrg";
import OptimizedImage from "./OptimizedImage";

interface HowToStep {
  name: string;
  text: string;
  image?: string;
  url?: string;
}

interface HowToGuideProps {
  title: string;
  description: string;
  image?: string;
  totalTime?: string; // Format: "PT2H30M" (2 hours, 30 minutes)
  estimatedCost?: {
    currency: string;
    value: string;
  };
  supplies?: string[];
  tools?: string[];
  steps: HowToStep[];
  className?: string;
}

/**
 * A step-by-step guide component with Schema.org HowTo structured data
 * for improved SEO and rich snippets in search results
 */
const HowToGuide: React.FC<HowToGuideProps> = ({
  title,
  description,
  image,
  totalTime,
  estimatedCost,
  supplies = [],
  tools = [],
  steps,
  className = "",
}) => {
  // Prepare schema data for the How-To
  const howToSchema = {
    type: 'howto' as const,
    name: title,
    description,
    image,
    totalTime,
    estimatedCost,
    supply: supplies,
    tool: tools,
    step: steps
  };

  // Format the total time for display
  const formatTime = (isoTime: string) => {
    try {
      // Remove PT prefix
      const timeStr = isoTime.replace('PT', '');
      
      // Extract hours and minutes
      const hourMatch = timeStr.match(/(\d+)H/);
      const minuteMatch = timeStr.match(/(\d+)M/);
      
      const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
      const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
      
      let result = '';
      if (hours > 0) {
        result += `${hours} hour${hours > 1 ? 's' : ''}`;
      }
      
      if (minutes > 0) {
        if (result) result += ' ';
        result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
      
      return result || 'Quick';
    } catch (e) {
      return isoTime;
    }
  };

  return (
    <div className={`${className}`}>
      {/* SEO-friendly schema markup */}
      <SchemaOrg schema={howToSchema} />

      {/* How-To header - adjusted for split layout */}
      <div className="mb-6">
        <h2 className="text-h2 text-[#2A6B7C] mb-2">
          {title}
        </h2>
        <p className="text-body-sm text-gray-600">
          {description}
        </p>
      </div>

      {/* How-To content - adjusted sizing for balanced layout */}
      <div>
        {/* Main image - smaller for split layout */}
        {image && (
          <div className="mb-4 rounded-lg overflow-hidden max-h-48 md:max-h-56">
            <OptimizedImage
              src={image}
              alt={`How to ${title}`}
              className="w-full"
              objectFit="cover"
            />
          </div>
        )}

        {/* Meta information - simplified for split layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {totalTime && (
            <Card>
              <CardContent className="p-3">
                <h4 className="font-sans text-label font-semibold text-gray-700">Total Time</h4>
                <p className="text-body-sm">{formatTime(totalTime)}</p>
              </CardContent>
            </Card>
          )}

          {estimatedCost && (
            <Card>
              <CardContent className="p-3">
                <h4 className="font-sans text-label font-semibold text-gray-700">Estimated Cost</h4>
                <p className="text-body-sm">{estimatedCost.currency} {estimatedCost.value}</p>
              </CardContent>
            </Card>
          )}

          {(supplies.length > 0 || tools.length > 0) && (
            <Card className={totalTime && estimatedCost ? "sm:col-span-2" : ""}>
              <CardContent className="p-3">
                <h4 className="font-sans text-label font-semibold text-gray-700">
                  {supplies.length > 0 && tools.length > 0
                    ? 'Supplies & Tools'
                    : supplies.length > 0
                    ? 'Supplies'
                    : 'Tools'}
                </h4>
                <ul className="list-disc ml-4 text-body-sm">
                  {supplies.map((supply, idx) => (
                    <li key={`supply-${idx}`}>{supply}</li>
                  ))}
                  {tools.map((tool, idx) => (
                    <li key={`tool-${idx}`}>{tool}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Steps - adjusted spacing for split layout */}
        <div className="space-y-4">
          <h3 className="text-h3 text-[#2A6B7C]">
            Step-by-Step Instructions
          </h3>
          
          <div className="space-y-5">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 flex items-start">
                  <div className="w-7 h-7 rounded-full bg-[#2A6B7C] text-white flex items-center justify-center font-bold text-body-sm">
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex-grow min-w-0">
                  <h4 className="font-serif text-h4 font-bold mb-1.5">{step.name}</h4>
                  <p className="text-body-sm mb-2">{step.text}</p>
                  
                  {step.image && (
                    <div className="my-2 rounded-md overflow-hidden">
                      <OptimizedImage
                        src={step.image}
                        alt={`Step ${index + 1}: ${step.name}`}
                        className="max-w-full h-auto max-h-48"
                        objectFit="cover"
                      />
                    </div>
                  )}
                  
                  {step.url && (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 mt-1 text-body-sm"
                    >
                      More details
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToGuide;