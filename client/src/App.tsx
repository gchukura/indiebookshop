import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Directory from "@/pages/Directory";
import StateDirectory from "@/pages/StateDirectory";
import CityDirectory from "@/pages/CityDirectory";
import CategoryDirectory from "@/pages/CategoryDirectory";
import StatesListPage from "@/pages/StatesListPage";
import CitiesListPage from "@/pages/CitiesListPage";
import CategoriesListPage from "@/pages/CategoriesListPage";
import CountiesListPage from "@/pages/CountiesListPage";
import CountyDirectory from "@/pages/CountyDirectory";
import BookshopDetailPage from "@/pages/BookshopDetailPage";
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
import { AdSenseHead } from "@/components/AdSenseHead";

// Component to scroll to top on route changes
function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Scroll to top when location changes
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />
      <Header />
      <div className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/directory" component={Directory} />
          <Route path="/directory/browse" component={StatesListPage} />
          <Route path="/directory/cities" component={CitiesListPage} />
          <Route path="/directory/categories" component={CategoriesListPage} />
          <Route path="/directory/state/:state" component={StateDirectory} />
          {/* New URL format with state in the path */}
          <Route path="/directory/city/:state/:city" component={CityDirectory} />
          
          {/* Legacy URL formats for backward compatibility */}
          <Route path="/directory/city/:city" component={CityDirectory} />
          <Route path="/directory/city-state/:citystate" component={CityDirectory} />
          <Route path="/directory/counties" component={CountiesListPage} />
          {/* Updated to more logical URL structure for counties */}
          <Route path="/directory/county/:state/:county" component={CountyDirectory} />
          
          {/* Keep old route format for backward compatibility and redirect */}
          <Route path="/directory/county-state/:countystate">
            {(params) => {
              // Parse county and state from combined parameter
              const parts = params.countystate.split('-');
              if (parts.length >= 2) {
                const county = parts.slice(0, -1).join('-');
                const state = parts[parts.length - 1];
                // Redirect to new URL format
                window.location.href = `/directory/county/${state}/${county}`;
              } else {
                // If parsing fails, redirect to counties list
                window.location.href = '/directory/counties';
              }
              return null;
            }}
          </Route>
          <Route path="/directory/category/:featureId" component={CategoryDirectory} />
          <Route path="/bookshop/:idslug" component={BookshopDetailPage} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BookshopProvider>
          <AdSenseHead />
          <Toaster />
          <Router />
        </BookshopProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
