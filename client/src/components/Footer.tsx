import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Facebook, Twitter, Instagram } from "lucide-react";

const Footer = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // In a real app, we would make an API call to subscribe the user
      toast({
        title: "Subscription successful!",
        description: "You have been subscribed to our newsletter.",
      });
      setEmail("");
    } else {
      toast({
        title: "Subscription failed",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
    }
  };

  return (
    <footer className="bg-[#5F4B32] text-white py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="font-serif text-xl font-bold mb-4">IndiebookShop</h4>
            <p className="text-white/80 mb-4">Connecting readers with independent bookstores across the United States.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-white hover:text-[#E16D3D]">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-white hover:text-[#E16D3D]">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-white hover:text-[#E16D3D]">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-serif text-lg font-bold mb-4">Explore</h4>
            <ul className="space-y-2">
              <li><Link href="/directory"><a className="text-white/80 hover:text-[#E16D3D]">Directory</a></Link></li>
              <li><Link href="/directory?view=map"><a className="text-white/80 hover:text-[#E16D3D]">Map View</a></Link></li>
              <li><Link href="/browse-by-state"><a className="text-white/80 hover:text-[#E16D3D]">Browse by State</a></Link></li>
              <li><Link href="/featured"><a className="text-white/80 hover:text-[#E16D3D]">Featured Stores</a></Link></li>
              <li><Link href="/events"><a className="text-white/80 hover:text-[#E16D3D]">Upcoming Events</a></Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-lg font-bold mb-4">For Bookstores</h4>
            <ul className="space-y-2">
              <li><Link href="/add-bookstore"><a className="text-white/80 hover:text-[#E16D3D]">Add Your Bookstore</a></Link></li>
              <li><Link href="/update-listing"><a className="text-white/80 hover:text-[#E16D3D]">Update Listing</a></Link></li>
              <li><Link href="/advertising"><a className="text-white/80 hover:text-[#E16D3D]">Advertising</a></Link></li>
              <li><Link href="/partnerships"><a className="text-white/80 hover:text-[#E16D3D]">Partnerships</a></Link></li>
              <li><Link href="/resources"><a className="text-white/80 hover:text-[#E16D3D]">Resources</a></Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif text-lg font-bold mb-4">Newsletter</h4>
            <p className="text-white/80 mb-4">Sign up to receive updates about new bookstores and literary events near you.</p>
            <form onSubmit={handleSubscribe} className="flex">
              <Input
                type="email"
                placeholder="Your email address"
                className="px-4 py-2 rounded-l-md w-full focus:outline-none text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button 
                type="submit" 
                className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white px-4 py-2 rounded-r-md"
              >
                Sign Up
              </Button>
            </form>
          </div>
        </div>
        <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60 text-sm">
          <p>&copy; {new Date().getFullYear()} IndiebookShop. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/privacy"><a className="hover:text-[#E16D3D]">Privacy Policy</a></Link>
            <Link href="/terms"><a className="hover:text-[#E16D3D]">Terms of Service</a></Link>
            <Link href="/contact"><a className="hover:text-[#E16D3D]">Contact Us</a></Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
