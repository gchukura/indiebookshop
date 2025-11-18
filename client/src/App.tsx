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
          
          {/* Redirect old routes to new unified directory with query params */}
          <Route path="/directory/browse">
            {() => {
              const [_, setLocation] = useLocation();
              useEffect(() => {
                setLocation('/directory', { replace: true });
              }, [setLocation]);
              return null;
            }}
          </Route>
          <Route path="/directory/cities">
            {() => {
              const [_, setLocation] = useLocation();
              useEffect(() => {
                setLocation('/directory', { replace: true });
              }, [setLocation]);
              return null;
            }}
          </Route>
          <Route path="/directory/counties">
            {() => {
              const [_, setLocation] = useLocation();
              useEffect(() => {
                setLocation('/directory', { replace: true });
              }, [setLocation]);
              return null;
            }}
          </Route>
          <Route path="/directory/state/:state">
            {(params) => {
              const [_, setLocation] = useLocation();
              useEffect(() => {
                setLocation(`/directory?state=${encodeURIComponent(params.state)}`, { replace: true });
              }, [setLocation, params.state]);
              return null;
            }}
          </Route>
          <Route path="/directory/city/:state/:city">
            {(params) => {
              const [_, setLocation] = useLocation();
              useEffect(() => {
                const state = params.state.toUpperCase();
                const city = params.city.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                setLocation(`/directory?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}`, { replace: true });
              }, [setLocation, params.state, params.city]);
              return null;
            }}
          </Route>
          <Route path="/directory/city/:city">
            {(params) => {
              const [_, setLocation] = useLocation();
              useEffect(() => {
                const city = params.city.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                setLocation(`/directory?city=${encodeURIComponent(city)}`, { replace: true });
              }, [setLocation, params.city]);
              return null;
            }}
          </Route>
          <Route path="/directory/city-state/:citystate">
            {(params) => {
              const [_, setLocation] = useLocation();
              useEffect(() => {
                const parts = params.citystate.split('-');
                if (parts.length >= 2) {
                  const state = parts[parts.length - 1].toUpperCase();
                  const city = parts.slice(0, -1).join('-').replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  setLocation(`/directory?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}`, { replace: true });
                } else {
                  setLocation('/directory', { replace: true });
                }
              }, [setLocation, params.citystate]);
              return null;
            }}
          </Route>
          <Route path="/directory/county/:state/:county">
            {(params) => {
              const [_, setLocation] = useLocation();
              useEffect(() => {
                const state = params.state.toUpperCase();
                const county = params.county.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                setLocation(`/directory?state=${encodeURIComponent(state)}&county=${encodeURIComponent(county)}`, { replace: true });
              }, [setLocation, params.state, params.county]);
              return null;
            }}
          </Route>
          <Route path="/directory/county-state/:countystate">
            {(params) => {
              const [_, setLocation] = useLocation();
              useEffect(() => {
                const parts = params.countystate.split('-');
                if (parts.length >= 2) {
                  const state = parts[parts.length - 1].toUpperCase();
                  const county = parts.slice(0, -1).join('-').replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  setLocation(`/directory?state=${encodeURIComponent(state)}&county=${encodeURIComponent(county)}`, { replace: true });
                } else {
                  setLocation('/directory', { replace: true });
                }
              }, [setLocation, params.countystate]);
              return null;
            }}
          </Route>
          
          <Route path="/directory/categories" component={CategoriesListPage} />
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
