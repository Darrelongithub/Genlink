import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ExitIntentPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if already shown this session
    const shown = sessionStorage.getItem("exitPopupShown");
    if (shown) {
      setHasShown(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setIsOpen(true);
        setHasShown(true);
        sessionStorage.setItem("exitPopupShown", "true");
      }
    };

    // Also trigger after 30 seconds of inactivity
    let inactivityTimer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (!hasShown) {
          setIsOpen(true);
          setHasShown(true);
          sessionStorage.setItem("exitPopupShown", "true");
        }
      }, 30000);
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mousemove", resetTimer);
    document.addEventListener("keypress", resetTimer);
    resetTimer();

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mousemove", resetTimer);
      document.removeEventListener("keypress", resetTimer);
      clearTimeout(inactivityTimer);
    };
  }, [hasShown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("🎉 Check your inbox! Your free checklist is on the way.");
      setIsOpen(false);
      setEmail("");
    }
  };

  const checklistItems = [
    "5-step financial freedom roadmap",
    "Daily mindset affirmations guide",
    "Beginner's forex trading checklist",
    "Digital skills assessment tool"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-card to-muted/50 border-accent/20">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center animate-pulse">
            <Gift className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Wait! Don't Miss Out 🎁
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Get your <span className="text-accent font-semibold">FREE Learning Success Checklist</span> before you go!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {checklistItems.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 text-sm"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-accent/30 focus:border-accent"
              required
            />
            <Button 
              type="submit" 
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground group"
            >
              <Sparkles className="w-4 h-4 mr-2 group-hover:animate-spin" />
              Get My Free Checklist
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Join 10,000+ Kenyan learners. No spam, unsubscribe anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
