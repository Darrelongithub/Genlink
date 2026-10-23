import { Card, CardContent } from "@/components/ui/card";
import { Brain, DollarSign, Code2, TrendingUp } from "lucide-react";

const WhySection = () => {
  const benefits = [
    {
      icon: Brain,
      title: "Spiritual Foundation First",
      description: "True wealth begins with inner transformation. Our curriculum uniquely integrates divine purpose, abundance mindset, and timeless wisdom—creating prosperity that flows from spiritual alignment, not just strategy.",
    },
    {
      icon: DollarSign,
      title: "Real Financial Mastery",
      description: "Move beyond theory. Master forex trading, investment strategies, and wealth-building systems that our instructors actively use. Learn from those who've achieved financial freedom and are living the results.",
    },
    {
      icon: Code2,
      title: "Future-Proof Digital Skills",
      description: "Acquire cutting-edge ICT expertise—AI, cloud computing, cybersecurity, and data science—that positions you at the forefront of the digital economy with skills that command premium income globally.",
    },
    {
      icon: TrendingUp,
      title: "Elite Learning Community",
      description: "Connect with ambitious, like-minded learners and mentors who challenge and inspire you. Access exclusive networking events, mastermind groups, and lifelong partnerships that accelerate your journey.",
    },
  ];

  return (
    <section id="about" className="py-20 bg-muted/30 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Why Genlink Hub Stands Apart
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We don't just teach courses—we architect complete life transformations. By uniquely combining 
            <strong> spiritual wealth</strong>, <strong>financial literacy</strong>, and <strong>advanced digital skills</strong>, 
            we create a holistic pathway to generational prosperity that no other platform offers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card 
              key={index} 
              className="group hover-scale hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-accent/50 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="pt-6 space-y-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <benefit.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <blockquote className="text-xl md:text-2xl italic text-foreground/80 max-w-3xl mx-auto">
            "The mind is everything. What you think, you become. Combine spiritual wisdom with practical skills, and you unlock generational wealth."
          </blockquote>
        </div>
      </div>
    </section>
  );
};

export default WhySection;
