# IndieBookShop.com

A directory and discovery platform for independent bookshops across the United States.

## Overview

IndieBookShop.com helps readers discover and connect with independent bookstores. The platform features:

- **Comprehensive Directory**: Browse over 3,000 independent bookshops
- **Interactive Map**: Explore bookshops by location with Mapbox integration
- **Detailed Listings**: View bookshop details, features, events, and contact information
- **SEO Optimized**: Server-side meta tags and canonical URLs for search engine optimization
- **Form Submissions**: Bookshop and event submission forms with email notifications

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Express.js (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Maps**: Mapbox GL JS
- **Styling**: Tailwind CSS
- **Routing**: Wouter

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for database)
- Mapbox account (for maps)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gchukura/indiebookshop.git
cd indiebookshop
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
indiebookshop/
├── client/          # React frontend application
├── server/          # Express.js backend server
├── api/            # Vercel serverless functions
├── shared/         # Shared TypeScript schemas
├── docs/           # Project documentation
└── scripts/         # Utility scripts
```

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Setup Guides](./docs/setup/)** - Installation and configuration
- **[Development Guides](./docs/guides/)** - Best practices and testing
- **[Technical Reference](./docs/reference/)** - Implementation details
- **[Code Reviews](./docs/reviews/)** - Review artifacts and assessments

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking

## Deployment

The application is deployed on Vercel. See [Deployment Guide](./docs/setup/DEPLOY-VERCEL.md) for details.

## Contributing

Please read the [Style Guide](./docs/guides/STYLE_GUIDE.md) before contributing.

## License

MIT

