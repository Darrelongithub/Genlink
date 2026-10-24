import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast({
        title: "Success!",
        description: "You've been subscribed to our newsletter.",
      });
      setEmail("");
    }
  };

  return (
    <section id="newsletter" className="py-20 bg-gradient-to-br from-primary via-primary/95 to-accent/80">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-accent-foreground" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
            Join the Elite Circle
          </h2>
          
          <p className="text-lg text-primary-foreground/90 leading-relaxed">
            Receive exclusive insights, early access to new courses, transformative content, and 
            special invitations to live events. Join thousands on the path to generational wealth.
          </p>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
            />
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground whitespace-nowrap">
              Subscribe
            </Button>
          </form>
          
          <p className="text-sm text-primary-foreground/70">
            Join 5,000+ learners on their journey to empowerment
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
