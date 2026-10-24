import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import genlinkLogo from "@/assets/genlink-logo.png";
import NavbarXPCounter from "@/components/xp/NavbarXPCounter";
import SoundToggle from "@/components/SoundToggle";
import AdaptEngineLink from "@/components/adapt/AdaptEngineLink";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src={genlinkLogo} alt="Genlink Hub" className="h-12 w-auto" />
            <span className="text-xl font-bold text-foreground">Genlink Hub</span>
          </a>

          <div className="hidden md:flex items-center gap-6">
            <NavbarXPCounter />
            <SoundToggle />
            <a href="/#courses" className="text-foreground/80 hover:text-accent transition-colors">
              Courses
            </a>
            <a href="/events" className="text-foreground/80 hover:text-accent transition-colors">
              Events
            </a>
            <a href="/resources" className="text-foreground/80 hover:text-accent transition-colors">
              Resources
            </a>
            <a href="/#why-us" className="text-foreground/80 hover:text-accent transition-colors">
              Why Us
            </a>
            <AdaptEngineLink className="text-foreground/80 hover:text-accent transition-colors" />
            <Button variant="default" className="bg-accent hover:bg-accent/90">
              Get Started
            </Button>
          </div>

          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 flex flex-col gap-4 pb-4">
            <a href="/#courses" className="text-foreground/80 hover:text-accent transition-colors">
              Courses
            </a>
            <a href="/events" className="text-foreground/80 hover:text-accent transition-colors">
              Events
            </a>
            <a href="/resources" className="text-foreground/80 hover:text-accent transition-colors">
              Resources
            </a>
            <a href="/#why-us" className="text-foreground/80 hover:text-accent transition-colors">
              Why Us
            </a>
            <AdaptEngineLink
              onNavigate={() => setIsMenuOpen(false)}
              className="text-foreground/80 hover:text-accent transition-colors"
            />
            <Button variant="default" className="bg-accent hover:bg-accent/90 w-full">
              Get Started
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
