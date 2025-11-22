import { Switch, Route, useLocation, useParams } from "wouter";
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
import ErrorBoundary from "@/components/ErrorBoundary";
import { BookshopProvider } from "@/context/BookshopContext";
import { AdSenseHead } from "@/components/AdSenseHead";
import { normalizeStateToAbbreviation } from "@/lib/stateUtils";

// Component to scroll to top on route changes
function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Scroll to top when location changes
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

// Redirect component for old state directory URLs
function StateDirectoryRedirect() {
  const params = useParams();
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    if (params.state) {
      const stateAbbr = normalizeStateToAbbreviation(params.state) || params.state.toUpperCase();
      navigate(`/directory?state=${encodeURIComponent(stateAbbr)}`, { replace: true });
    }
  }, [params.state, navigate]);
  
  return null;
}

// Redirect component for old city directory URLs
function CityDirectoryRedirect() {
  const params = useParams();
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    const queryParams = new URLSearchParams();
    
    if (params.state) {
      const stateAbbr = normalizeStateToAbbreviation(params.state) || params.state.toUpperCase();
      queryParams.set('state', stateAbbr);
    }
    
    if (params.city) {
      // Decode slug: "new-york" → "New York"
      const cityName = params.city
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      queryParams.set('city', cityName);
    }
    
    navigate(`/directory?${queryParams.toString()}`, { replace: true });
  }, [params.state, params.city, navigate]);
  
  return null;
}

// Redirect component for old city-state combined URLs
function CityStateCombinedRedirect() {
  const params = useParams();
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    if (params.citystate) {
      const parts = params.citystate.split('-');
      if (parts.length >= 2) {
        const stateSlug = parts[parts.length - 1];
        const citySlug = parts.slice(0, parts.length - 1).join('-');
        const stateAbbr = normalizeStateToAbbreviation(stateSlug) || stateSlug.toUpperCase();
        const cityName = citySlug
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        navigate(`/directory?state=${encodeURIComponent(stateAbbr)}&city=${encodeURIComponent(cityName)}`, { replace: true });
      } else {
        navigate('/directory', { replace: true });
      }
    }
  }, [params.citystate, navigate]);
  
  return null;
}

// Redirect component for old county directory URLs
function CountyDirectoryRedirect() {
  const params = useParams();
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    const queryParams = new URLSearchParams();
    
    if (params.state) {
      const stateAbbr = normalizeStateToAbbreviation(params.state) || params.state.toUpperCase();
      queryParams.set('state', stateAbbr);
    }
    
    if (params.county) {
      // Decode slug and remove "County" suffix if present
      let countyName = params.county
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      countyName = countyName.replace(/\s+County$/i, '');
      queryParams.set('county', countyName);
    }
    
    navigate(`/directory?${queryParams.toString()}`, { replace: true });
  }, [params.state, params.county, navigate]);
  
  return null;
}

// Redirect component for old county-state combined URLs
function CountyStateCombinedRedirect() {
  const params = useParams();
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    if (params.countystate) {
      const parts = params.countystate.split('-');
      if (parts.length >= 2) {
        const stateSlug = parts[parts.length - 1];
        const countySlug = parts.slice(0, parts.length - 1).join('-');
        const stateAbbr = normalizeStateToAbbreviation(stateSlug) || stateSlug.toUpperCase();
        let countyName = countySlug
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        countyName = countyName.replace(/\s+County$/i, '');
        navigate(`/directory?state=${encodeURIComponent(stateAbbr)}&county=${encodeURIComponent(countyName)}`, { replace: true });
      } else {
        navigate('/directory', { replace: true });
      }
    }
  }, [params.countystate, navigate]);
  
  return null;
}

// Redirect component for old category directory URLs
function CategoryDirectoryRedirect() {
  const params = useParams();
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    if (params.featureId) {
      navigate(`/directory?features=${encodeURIComponent(params.featureId)}`, { replace: true });
    } else {
      navigate('/directory', { replace: true });
    }
  }, [params.featureId, navigate]);
  
  return null;
}

// Redirect component for old list pages
function ListPageRedirect() {
  const [_, navigate] = useLocation();
  
  useEffect(() => {
    navigate('/directory', { replace: true });
  }, [navigate]);
  
  return null;
}

function Router() {
  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen">
        <ScrollToTop />
        <Header />
        <div className="flex-grow">
          <Switch>
          <Route path="/" component={Home} />
          <Route path="/directory" component={Directory} />
          
          {/* Old list pages - redirect to unified /directory page */}
          <Route path="/directory/browse" component={ListPageRedirect} />
          <Route path="/directory/cities" component={ListPageRedirect} />
          <Route path="/directory/categories" component={ListPageRedirect} />
          <Route path="/directory/counties" component={ListPageRedirect} />
          
          {/* Old directory routes - redirect to unified /directory page with query params */}
          {/* Server-side redirects handle these, but client-side redirects provide backup */}
          <Route path="/directory/state/:state" component={StateDirectoryRedirect} />
          <Route path="/directory/city/:state/:city" component={CityDirectoryRedirect} />
          <Route path="/directory/city/:city" component={CityDirectoryRedirect} />
          <Route path="/directory/city-state/:citystate" component={CityStateCombinedRedirect} />
          <Route path="/directory/county/:state/:county" component={CountyDirectoryRedirect} />
          <Route path="/directory/county-state/:countystate" component={CountyStateCombinedRedirect} />
          <Route path="/directory/category/:featureId" component={CategoryDirectoryRedirect} />
          
          {/* Keep old components for now in case they're accessed directly (will be redirected) */}
          {/* These can be removed once we confirm redirects work everywhere */}
          <Route path="/directory/state-old/:state" component={StateDirectory} />
          <Route path="/directory/city-old/:state/:city" component={CityDirectory} />
          <Route path="/directory/city-old/:city" component={CityDirectory} />
          <Route path="/directory/county-old/:state/:county" component={CountyDirectory} />
          <Route path="/directory/category-old/:featureId" component={CategoryDirectory} />
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
    </ErrorBoundary>
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
