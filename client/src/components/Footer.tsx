import { useState } from "react";
import { Link } from "wouter";
import { Facebook, Twitter, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // This is just a mock subscription - would connect to API in production
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Subscribed!",
        description: "Thank you for joining our newsletter.",
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Newsletter Section */}
      <section className="py-10 bg-[#F7F3E8] text-[#5F4B32]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-serif font-bold mb-3">Join Our Literary Community</h2>
          <p className="text-base opacity-90 max-w-2xl mx-auto mb-4">
            Connect with fellow book lovers, stay updated on bookstore events, and discover new independent bookshops.
          </p>
          <div className="max-w-md mx-auto">
            <form className="flex flex-col sm:flex-row gap-2 justify-center items-stretch" onSubmit={handleSubscribe}>
              <div className="flex-grow">
                <input 
                  type="email" 
                  placeholder="Your email address" 
                  className="w-full px-3 py-2 rounded-md border-0 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#E16D3D]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white px-4 py-2 h-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#5F4B32] text-white py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-white/20 pt-2 text-center">
            <p className="mb-3">&copy; {new Date().getFullYear()} IndiebookShop. All rights reserved.</p>
            
            <div className="flex justify-center space-x-6">
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
        </div>
      </footer>
    </>
  );
};

export default Footer;
