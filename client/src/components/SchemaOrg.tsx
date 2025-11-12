import React from 'react';
import { Helmet } from 'react-helmet-async';

type BookshopSchema = {
  type: 'bookshop';
  name: string;
  description: string;
  url: string;
  image?: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  telephone?: string;
  geo?: {
    latitude: string;
    longitude: string;
  };
  openingHours?: string;
  features?: string[];
};

type EventSchema = {
  type: 'event';
  name: string;
  description: string;
  url: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: {
      streetAddress: string;
      addressLocality: string;
      addressRegion: string;
      postalCode: string;
      addressCountry: string;
    };
  };
  organizer?: {
    name: string;
    url: string;
  };
  image?: string;
};

type OrganizationSchema = {
  type: 'organization';
  name: string;
  description: string;
  url: string;
  logo?: string;
  sameAs?: string[];
};

type WebsiteSchema = {
  type: 'website';
  name: string;
  description: string;
  url: string;
  image?: string;
};

type BreadcrumbSchema = {
  type: 'breadcrumb';
  itemListElement: Array<{
    position: number;
    name: string;
    item: string;
  }>;
};

type FAQSchema = {
  type: 'faq';
  questions: Array<{
    question: string;
    answer: string;
  }>;
};

type HowToSchema = {
  type: 'howto';
  name: string;
  description: string;
  image?: string;
  totalTime?: string; // Format: "PT2H30M" (2 hours, 30 minutes)
  estimatedCost?: {
    currency: string;
    value: string;
  };
  supply?: string[];
  tool?: string[];
  step: Array<{
    name: string;
    text: string;
    image?: string;
    url?: string;
  }>;
};

type SchemaProps = {
  schema: 
    | BookshopSchema 
    | EventSchema 
    | OrganizationSchema 
    | WebsiteSchema 
    | BreadcrumbSchema
    | FAQSchema
    | HowToSchema;
};

export const SchemaOrg: React.FC<SchemaProps> = ({ schema }) => {
  const generateSchemaOrgJSONLD = () => {
    switch (schema.type) {
      case 'bookshop':
        return {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          'subType': 'BookStore',
          'name': schema.name,
          'description': schema.description,
          'url': schema.url,
          'image': schema.image,
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': schema.address.streetAddress,
            'addressLocality': schema.address.addressLocality,
            'addressRegion': schema.address.addressRegion,
            'postalCode': schema.address.postalCode,
            'addressCountry': schema.address.addressCountry
          },
          'telephone': schema.telephone,
          ...(schema.geo && {
            'geo': {
              '@type': 'GeoCoordinates',
              'latitude': schema.geo.latitude,
              'longitude': schema.geo.longitude
            }
          }),
          'openingHours': schema.openingHours
        };
      
      case 'event':
        return {
          '@context': 'https://schema.org',
          '@type': 'Event',
          'name': schema.name,
          'description': schema.description,
          'url': schema.url,
          'startDate': schema.startDate,
          'endDate': schema.endDate,
          'location': {
            '@type': 'Place',
            'name': schema.location.name,
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': schema.location.address.streetAddress,
              'addressLocality': schema.location.address.addressLocality,
              'addressRegion': schema.location.address.addressRegion,
              'postalCode': schema.location.address.postalCode,
              'addressCountry': schema.location.address.addressCountry
            }
          },
          ...(schema.organizer && {
            'organizer': {
              '@type': 'Organization',
              'name': schema.organizer.name,
              'url': schema.organizer.url
            }
          }),
          'image': schema.image
        };
      
      case 'organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': schema.name,
          'description': schema.description,
          'url': schema.url,
          'logo': schema.logo,
          'sameAs': schema.sameAs
        };
      
      case 'website':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': schema.name,
          'description': schema.description,
          'url': schema.url,
          'image': schema.image
        };
        
      case 'breadcrumb':
        return {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          'itemListElement': schema.itemListElement.map(item => ({
            '@type': 'ListItem',
            'position': item.position,
            'name': item.name,
            'item': item.item
          }))
        };

      case 'faq':
        return {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'mainEntity': schema.questions.map(qa => ({
            '@type': 'Question',
            'name': qa.question,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': qa.answer
            }
          }))
        };

      case 'howto':
        return {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          'name': schema.name,
          'description': schema.description,
          'image': schema.image,
          'totalTime': schema.totalTime,
          ...(schema.estimatedCost && {
            'estimatedCost': {
              '@type': 'MonetaryAmount',
              'currency': schema.estimatedCost.currency,
              'value': schema.estimatedCost.value
            }
          }),
          'supply': schema.supply?.map(item => ({
            '@type': 'HowToSupply',
            'name': item
          })),
          'tool': schema.tool?.map(item => ({
            '@type': 'HowToTool',
            'name': item
          })),
          'step': schema.step.map((step, index) => ({
            '@type': 'HowToStep',
            'position': index + 1,
            'name': step.name,
            'text': step.text,
            'image': step.image,
            'url': step.url
          }))
        };
      
      default:
        return {};
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(generateSchemaOrgJSONLD())}
      </script>
    </Helmet>
  );
};

export default SchemaOrg;