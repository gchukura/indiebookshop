import { Link } from "wouter";
import { Facebook, Twitter, Instagram } from "lucide-react";

const Footer = () => {

  return (
    <footer className="bg-[#5F4B32] text-white py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-white/20 pt-4 text-center">
          <p className="mb-4">&copy; {new Date().getFullYear()} IndiebookShop. All rights reserved.</p>
          
          <div className="flex justify-center space-x-6 mb-4">
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
          
          <div className="space-x-6">
            <Link href="/privacy" className="text-white/80 hover:text-[#E16D3D]">Privacy Policy</Link>
            <Link href="/terms" className="text-white/80 hover:text-[#E16D3D]">Terms of Service</Link>
            <Link href="/contact" className="text-white/80 hover:text-[#E16D3D]">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
