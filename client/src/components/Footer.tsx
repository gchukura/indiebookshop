import { Link } from "wouter";
import { Facebook, Twitter, Instagram } from "lucide-react";

const Footer = () => {

  return (
    <footer className="bg-[#5F4B32] text-white py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          <div className="md:text-right">
            <h4 className="font-serif text-lg font-bold mb-4">About Us</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-white/80 hover:text-[#E16D3D]">Our Mission</Link></li>
              <li><Link href="/blog" className="text-white/80 hover:text-[#E16D3D]">Blog</Link></li>
              <li><Link href="/contact" className="text-white/80 hover:text-[#E16D3D]">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60 text-sm">
          <p>&copy; {new Date().getFullYear()} IndiebookShop. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/privacy" className="hover:text-[#E16D3D]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#E16D3D]">Terms of Service</Link>
            <Link href="/contact" className="hover:text-[#E16D3D]">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
