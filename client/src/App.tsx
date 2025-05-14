import { Switch, Route } from "wouter";
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
import BookstoreDetailPage from "@/pages/BookstoreDetailPage";
import SubmitBookstore from "@/pages/SubmitBookstore";
import Blog from "@/pages/Blog";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BookstoreProvider } from "@/context/BookstoreContext";

function Router() {
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
          <Route path="/directory/state/:state" component={StateDirectory} />
          <Route path="/directory/city/:city" component={CityDirectory} />
          <Route path="/directory/category/:featureId" component={CategoryDirectory} />
          <Route path="/bookstore/:id" component={BookstoreDetailPage} />
          <Route path="/submit" component={SubmitBookstore} />
          <Route path="/blog" component={Blog} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
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
        <BookstoreProvider>
          <Toaster />
          <Router />
        </BookstoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
