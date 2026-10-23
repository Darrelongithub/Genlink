import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Flame } from "lucide-react";
import { courses } from "@/data/courses";

const TrendingPicks = () => {
  // Mock trending data - top 4 courses
  const trendingCourses = courses.slice(0, 4);
  
  return (
    <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
            <Flame className="w-4 h-4 text-accent animate-pulse" />
            <span className="text-sm font-medium text-accent">What's Hot Right Now</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Discover What Top Learners Are Mastering
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join thousands of ambitious Kenyans already transforming their futures
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingCourses.map((course, index) => (
            <div 
              key={course.id}
              className="group relative bg-card rounded-xl p-5 border border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="bg-accent/10 text-accent border-0 text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  #{index + 1} Trending
                </Badge>
              </div>
              
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <img 
                  src={course.image} 
                  alt={course.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              
              <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                {course.title}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{Math.floor(Math.random() * 500 + 200)} learners this week</span>
              </div>
              
              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={i}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-secondary border-2 border-card"
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">+{Math.floor(Math.random() * 50 + 10)} just enrolled</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingPicks;
