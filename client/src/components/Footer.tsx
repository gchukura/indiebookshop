import { Link } from "wouter";
import { Facebook, Twitter, Instagram } from "lucide-react";

const Footer = () => {

  return (
    <footer className="bg-[#2A6B7C] text-white py-8">
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
  );
};

export default Footer;
