import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import SchemaOrg from "./SchemaOrg";
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
    <div className={`my-8 ${className}`}>
      {/* SEO-friendly schema markup */}
      <SchemaOrg schema={howToSchema} />

      {/* How-To header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2A6B7C]">
          {title}
        </h2>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      {/* How-To content */}
      <div className="max-w-4xl mx-auto">
        {/* Main image */}
        {image && (
          <div className="mb-6 rounded-lg overflow-hidden max-h-72">
            <OptimizedImage
              src={image}
              alt={`How to ${title}`}
              className="w-full"
              objectFit="cover"
            />
          </div>
        )}

        {/* Meta information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {totalTime && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-700">Total Time</h4>
                <p>{formatTime(totalTime)}</p>
              </CardContent>
            </Card>
          )}

          {estimatedCost && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-700">Estimated Cost</h4>
                <p>{estimatedCost.currency} {estimatedCost.value}</p>
              </CardContent>
            </Card>
          )}

          {(supplies.length > 0 || tools.length > 0) && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-700">
                  {supplies.length > 0 && tools.length > 0
                    ? 'Supplies & Tools'
                    : supplies.length > 0
                    ? 'Supplies'
                    : 'Tools'}
                </h4>
                <ul className="list-disc ml-4 text-sm">
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

        {/* Steps */}
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-[#2A6B7C]">
            Step-by-Step Instructions
          </h3>
          
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4">
                <div className="md:w-8 flex-shrink-0 flex items-start justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#2A6B7C] text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex-grow">
                  <h4 className="font-medium text-lg mb-2">{step.name}</h4>
                  <p className="text-gray-700 mb-3">{step.text}</p>
                  
                  {step.image && (
                    <div className="my-3 rounded-md overflow-hidden">
                      <OptimizedImage
                        src={step.image}
                        alt={`Step ${index + 1}: ${step.name}`}
                        className="max-w-full h-auto max-h-60"
                        objectFit="cover"
                      />
                    </div>
                  )}
                  
                  {step.url && (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 mt-2"
                    >
                      More details
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
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