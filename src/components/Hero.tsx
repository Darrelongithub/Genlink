import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, ChevronDown } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const intriguingQuestions = [
  "Ready to unlock your next learning breakthrough?",
  "What if you could master finance, tech, and mindset?",
  "Are you ready to build generational wealth?",
  "Discover what separates top achievers from the rest?"
];

const Hero = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentQuestion((prev) => (prev + 1) % intriguingQuestions.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const scrollToContent = () => {
    document.getElementById('pillars-preview')?.scrollIntoView({ behavior: 'smooth' });
  };
  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80">
        <img
          src={heroBanner}
          alt="Empowerment Journey"
          className="w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent" />
        
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-accent/30 rounded-full animate-pulse"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + i * 0.5}s`
              }}
            />
          ))}
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Intriguing rotating question */}
          <div 
            className={`transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
          >
            <span className="text-lg md:text-xl text-accent font-medium">
              {intriguingQuestions[currentQuestion]}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 backdrop-blur-sm border border-accent/30 animate-fade-in">
            <Sparkles className="w-4 h-4 text-accent-foreground animate-pulse" />
            <span className="text-sm text-accent-foreground font-medium">Linking Generations • 10,000+ Kenyan Learners</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight animate-fade-in">
            Renew the Mind, <br className="hidden md:block" />
            <span className="text-accent relative">
              Empower
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M1 5.5C47.5 2 100.5 1.5 199 5.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-accent/50"/>
              </svg>
            </span> the Generation
          </h1>
          
          <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
            Transform your life through a revolutionary blend of <strong className="text-accent">spiritual renewal</strong>, 
            <strong className="text-accent"> financial wisdom</strong>, and <strong className="text-accent">cutting-edge digital skills</strong>. 
            Join Kenya's fastest-growing learning community.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <a href="#pillars-preview">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground group hover-scale text-lg px-8 py-6">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Button
              size="lg"
              onClick={scrollToHowItWorks}
              className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border border-primary-foreground/40 hover-scale text-lg px-8 py-6 group backdrop-blur-sm"
            >
              <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              See How It Works
            </Button>
          </div>

          {/* Social proof ticker */}
          <div className="flex flex-wrap justify-center gap-6 pt-8 text-primary-foreground/80 text-sm animate-fade-in" style={{ animationDelay: '600ms' }}>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-secondary border-2 border-primary" />
                ))}
              </div>
              <span>10,000+ active learners</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-premium">★★★★★</span>
              <span>4.9/5 rating</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button 
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-primary-foreground/60 hover:text-primary-foreground transition-colors animate-bounce"
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      </div>
    </section>
  );
};

export default Hero;
