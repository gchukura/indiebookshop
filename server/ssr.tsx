import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BookshopProvider } from '@/context/BookshopContext';
import App from '../client/src/App';
import { Helmet, HelmetProvider } from 'react-helmet-async';

// This will be populated by Vite with the client build
let template = '';
const isProd = process.env.NODE_ENV === 'production';
const distPath = path.resolve(process.cwd(), 'dist/client');

// In production, we read the template once
if (isProd) {
  template = fs.readFileSync(path.resolve(distPath, 'index.html'), 'utf-8');
}

/**
 * Renders the app server-side and injects it into the HTML template
 */
export async function render(req: Request, res: Response) {
  try {
    // In development, template is passed from vite middleware
    const htmlTemplate = isProd ? template : res.locals.template || '';

    // Initialize a fresh React Query client for each request
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Don't refetch on the server
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
          retry: false,
          staleTime: Infinity,
        },
      },
    });

    // This context will gather data from our Helmet usage
    const helmetContext = {};

    // Render the app to a string
    const appHtml = renderToString(
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BookshopProvider>
              <StaticRouter location={req.url}>
                <App />
              </StaticRouter>
            </BookshopProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    );

    // Get the dehydrated state from React Query
    const dehydratedState = JSON.stringify(
      queryClient.getQueryCache().getAll().map((query) => {
        return {
          queryKey: query.queryKey,
          state: query.state,
        };
      })
    );

    // Get all the headers from Helmet
    const { helmet } = helmetContext as any;

    // Replace placeholders in the HTML template with our content
    let html = htmlTemplate
      .replace(`<div id="root"></div>`, `<div id="root">${appHtml}</div>`)
      .replace(
        '</head>',
        `${helmet?.title?.toString() || ''}
         ${helmet?.meta?.toString() || ''}
         ${helmet?.link?.toString() || ''}
         <script>
           window.__REACT_QUERY_STATE__ = ${dehydratedState};
         </script>
         </head>`
      );

    res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
  } catch (error) {
    console.error('Error during SSR:', error);
    
    // On error, fall back to client-side rendering
    const errorHtml = template
      .replace(
        '</head>',
        `<script>
          console.error("Error during server-side rendering. Falling back to client-side rendering.");
        </script></head>`
      );
      
    res.status(500).set({ 'Content-Type': 'text/html' }).end(errorHtml);
  }
}