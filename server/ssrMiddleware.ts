import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
// The JSX elements are commented out as we can't directly render React on the server
// in this environment without further Vite configuration
// import React from 'react';
// import { renderToString } from 'react-dom/server';
// import { StaticRouter } from 'react-router-dom/server';
// import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
// import { BookshopProvider } from '../client/src/context/BookshopContext';
// import App from '../client/src/App';
import { QueryClient } from '@tanstack/react-query';
// import { HelmetProvider } from 'react-helmet-async';
import { log } from './vite';

const isProd = process.env.NODE_ENV === 'production';
let template = '';
const distPath = path.resolve(process.cwd(), 'dist/client');

// In production, read the template once
if (isProd) {
  try {
    template = fs.readFileSync(path.resolve(distPath, 'index.html'), 'utf-8');
  } catch (error) {
    console.error('Failed to read production template, SSR will be disabled');
  }
}

// Only apply SSR to routes that need it - we can expand this list as needed
const SSR_ROUTES = [
  '/',
  '/about',
  '/directory',
  '/directory/browse',
  '/directory/cities',
  '/directory/categories',
  '/directory/state',
  '/directory/city',
  '/directory/category',
  '/bookshop'
];

/**
 * Middleware to handle server-side rendering
 */
export function ssrMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip SSR for API routes, static assets, etc.
  if (req.path.startsWith('/api/') || 
      req.path.includes('.') || 
      !shouldApplySSR(req.path)) {
    return next();
  }

  try {
    // In development, get the template from earlier middleware
    const htmlTemplate = isProd ? template : res.locals.template;
    
    // If we don't have a template, fall back to client-side rendering
    if (!htmlTemplate) {
      log('No HTML template available for SSR, falling back to CSR', 'ssr');
      return next();
    }

    // Initialize React Query client
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

    // Set up Helmet context for SEO
    const helmetContext = {};

    // Render the app to a string
    const appHtml = renderToString(
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={queryClient}>
          <BookshopProvider>
            <StaticRouter location={req.url}>
              <App />
            </StaticRouter>
          </BookshopProvider>
        </QueryClientProvider>
      </HelmetProvider>
    );

    // Get React Query state to hydrate on the client
    const dehydratedState = JSON.stringify(
      queryClient.getQueryCache().getAll().map((query) => {
        return {
          queryKey: query.queryKey,
          state: query.state,
        };
      })
    );

    // Get SEO headers from Helmet
    const { helmet } = helmetContext as any;

    // Inject our rendered app into the HTML template
    let html = htmlTemplate
      .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
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
    log(`SSR applied to ${req.path}`, 'ssr');
  } catch (error) {
    console.error('Error during SSR:', error);
    // On error, fall back to client-side rendering
    next();
  }
}

/**
 * Determine if SSR should be applied to this route
 */
function shouldApplySSR(path: string): boolean {
  return SSR_ROUTES.some(route => {
    // Exact match
    if (route === path) return true;
    // Starts with route pattern + /
    if (path.startsWith(`${route}/`)) return true;
    return false;
  });
}