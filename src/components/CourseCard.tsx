import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Play, BookOpen, Brain, Layers } from "lucide-react";
import { getPillarForCourse } from "@/data/courses";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  duration: string;
  isPremium: boolean;
  price?: string;
  image: string;
  rating: number;
  pillarId: string;
  subcategory?: string;
  responsibleUse?: string[];
  hasCapstone: boolean;
  progressionLevel: string;
  onLearnMore: () => void;
}

const CourseCard = ({
  id,
  title,
  description,
  duration,
  isPremium,
  price,
  image,
  rating,
  pillarId,
  subcategory,
  responsibleUse,
  hasCapstone,
  onLearnMore,
}: CourseCardProps) => {
  const hasResponsibleUse = responsibleUse && responsibleUse.length > 0;
  const pillar = getPillarForCourse(id);

  return (
    <Card 
      className={`group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
        isPremium ? "border-premium/50 shadow-[0_0_20px_rgba(255,215,0,0.1)]" : "shadow-lg"
      }`}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {pillar && (
            <Badge className="bg-primary/90 text-primary-foreground border-0 shadow-lg text-xs">
              {pillar.name.split("&")[0].trim()}
            </Badge>
          )}
        </div>
        {isPremium && (
          <Badge className="absolute top-3 right-3 bg-premium text-premium-foreground border-0 shadow-lg">
            Premium
          </Badge>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1 bg-accent/80 backdrop-blur-sm text-accent-foreground px-2 py-1 rounded-full text-xs">
            <BookOpen className="w-3 h-3" />
            <span>Foundation Free</span>
          </div>
          {hasCapstone && (
            <div className="flex items-center gap-1 bg-premium/80 backdrop-blur-sm text-premium-foreground px-2 py-1 rounded-full text-xs">
              <Layers className="w-3 h-3" />
              <span>Capstone</span>
            </div>
          )}
          {hasResponsibleUse && (
            <div className="flex items-center gap-1 bg-primary/80 backdrop-blur-sm text-primary-foreground px-2 py-1 rounded-full text-xs">
              <Brain className="w-3 h-3" />
              <span>Ethics</span>
            </div>
          )}
        </div>
      </div>
      
      <CardHeader>
        <CardTitle className="text-xl line-clamp-2 group-hover:text-accent transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-premium text-premium" />
            <span className="font-medium">{rating}</span>
          </div>
        </div>

        {/* Progression indicator */}
        <div className="flex gap-1">
          {["Foundation", "Practitioner", "Specialist", "Elite"].map((level, i) => (
            <div key={level} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full ${i === 0 ? "bg-accent" : "bg-muted"}`} />
              <span className="text-[10px] text-muted-foreground">{level}</span>
            </div>
          ))}
        </div>
        
        {isPremium && price && (
          <div className="text-2xl font-bold text-premium">{price}</div>
        )}
      </CardContent>
      
      <CardFooter className="gap-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onLearnMore}
        >
          Learn More
        </Button>
        <Button 
          asChild
          className={isPremium ? "flex-1 bg-premium hover:bg-premium/90 text-premium-foreground" : "flex-1 bg-accent hover:bg-accent/90"}
        >
          <Link to={`/learn/${id}`}>
            <Play className="w-4 h-4 mr-1" />
            Start Free
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;
