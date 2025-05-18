import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Directory from "@/pages/Directory";
import StateDirectory from "@/pages/StateDirectory";
import CityDirectory from "@/pages/CityDirectory";
import CountyDirectory from "@/pages/CountyDirectory";
import CountiesDirectory from "@/pages/CountiesDirectory";
import CategoryDirectory from "@/pages/CategoryDirectory";
import StatesListPage from "@/pages/StatesListPage";
import CitiesListPage from "@/pages/CitiesListPage";
import CategoriesListPage from "@/pages/CategoriesListPage";
import UnifiedBookshopDetail from "@/components/UnifiedBookshopDetail";
import TestBookshopPage from "@/pages/TestBookshopPage";
import SimpleBookshopPage from "@/pages/SimpleBookshopPage";
import SubmitBookshop from "@/pages/SubmitBookshop";
import SubmitEvent from "@/pages/SubmitEvent";
import TestBookshops from "@/pages/TestBookshops";
import Blog from "@/pages/Blog";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Events from "@/pages/Events";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BookshopProvider } from "@/context/BookshopContext";
import UnifiedBookshopDetailHandler from "@/components/UnifiedBookshopDetailHandler";
import StateRedirector from "@/components/StateRedirector";
import BookshopRedirectHandler from "@/components/BookshopRedirectHandler";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/directory" component={Directory} />
          <Route path="/directory/browse" component={StatesListPage} />
          <Route path="/directory/cities" component={CitiesListPage} />
          <Route path="/directory/categories" component={CategoriesListPage} />
          <Route path="/directory/counties" component={CountiesDirectory} />
          <Route path="/directory/state/:state" component={StateDirectory} />
          <Route path="/directory/city/:city" component={CityDirectory} />
          <Route path="/directory/category/:featureId" component={CategoryDirectory} />
          
          {/* SEO-friendly URL structure for states with redirect handler */}
          <Route path="/bookshops/:state" component={StateRedirector} />
          <Route path="/bookshops/:state" component={StateDirectory} />
          
          {/* SEO-friendly URL structure with county information */}
          <Route path="/bookshops/:state/:county" component={CountyDirectory} />
          
          {/* SEO-friendly URL structure for cities (without county) */}
          <Route path="/bookshops/:state/:city" component={CityDirectory} />
          
          {/* SEO-friendly URL structure for cities (with county) */}
          <Route path="/bookshops/:state/:county/:city" component={CityDirectory} />
          
          {/* SEO-friendly URL structure for categories */}
          <Route path="/bookshops/category/:categoryName/:featureId" component={CategoryDirectory} />
          
          {/* Test route for direct bookshop access */}
          <Route path="/test-bookshop/:id" component={TestBookshopPage} />

          {/* Standalone bookshop detail page by ID for direct access */}
          <Route path="/bookshop/:id(\d+)" component={SimpleBookshopPage} />
          
          {/* Redirect legacy ID URLs to SEO-friendly URLs */}
          <Route path="/bookshop-redirect/:id(\d+)" component={BookshopRedirectHandler} />
          
          {/* SEO-friendly bookshop detail URLs */}
          <Route path="/bookshop/:state/:county/:city/:name" component={UnifiedBookshopDetail} />
          <Route path="/bookshop/:state/:city/:name" component={UnifiedBookshopDetail} />
          <Route path="/bookshop/:name" component={UnifiedBookshopDetail} />
          
          {/* Regular routes */}
          <Route path="/submit" component={SubmitBookshop} />
          <Route path="/submit-event" component={SubmitEvent} />
          <Route path="/blog" component={Blog} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/events" component={Events} />
          <Route path="/test-bookshops" component={TestBookshops} />
          
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
    </div>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);
  
  // Add passive touch listeners for better mobile scrolling
  useEffect(() => {
    // Add passive event listeners to improve scroll performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
    
    // Add a class to the body based on device type
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      document.body.classList.add('is-mobile-device');
    }
    
    return () => {
      document.removeEventListener('touchstart', () => {});
      document.removeEventListener('touchmove', () => {});
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BookshopProvider>
          <Toaster />
          <Router />
        </BookshopProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
