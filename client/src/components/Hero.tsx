import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface HeroProps {
  title?: string;
  subtitle?: string;
  showButton?: boolean;
  buttonUrl?: string;
  buttonText?: string;
  imageUrl?: string;
  imageAlt?: string;
}

const Hero = ({
  title = "Discover Independent Bookstores",
  subtitle = "Explore unique bookshops across the United States and find your next literary haven.",
  showButton = false,
  buttonUrl = "/directory",
  buttonText = "Find Bookstores",
  imageUrl,
  imageAlt
}: HeroProps) => {
  return (
    <section className="bg-[#5F4B32] text-white py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-4">
            {title}
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            {subtitle}
          </p>
          {showButton && (
            <div className="max-w-xl mx-auto">
              <Link href={buttonUrl}>
                <Button 
                  className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white rounded-full px-8 py-6 text-lg"
                >
                  {buttonText}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
