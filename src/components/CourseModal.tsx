import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, CheckCircle2, Brain, ShieldCheck, Layers, Briefcase, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { type Course, getPillarForCourse, entrepreneurialIntelligenceModule, progressionLevels, type ProgressionLevel } from "@/data/courses";

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
}

const CourseModal = ({ isOpen, onClose, course }: CourseModalProps) => {
  if (!course) return null;

  const pillar = getPillarForCourse(course.id);
  const paths = pillar?.learningPaths ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="relative h-64 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-lg">
            <img
              src={course.image}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex gap-2">
              {pillar && (
                <Badge className="bg-primary/90 text-primary-foreground border-0">
                  {pillar.name}
                </Badge>
              )}
            </div>
            {course.isPremium && (
              <Badge className="absolute top-4 right-4 bg-premium text-premium-foreground border-0">
                Premium
              </Badge>
            )}
          </div>
          
          <DialogTitle className="text-2xl">{course.title}</DialogTitle>
          <DialogDescription className="text-base">
            {course.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span className="font-medium">{course.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-premium text-premium" />
                <span className="font-bold">{course.rating}</span>
              </div>
            </div>
            {course.isPremium && course.price && (
              <div className="text-3xl font-bold text-premium">{course.price}</div>
            )}
          </div>

          {/* Progression Levels */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-accent" />
              Progression Levels
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(progressionLevels) as [ProgressionLevel, typeof progressionLevels[ProgressionLevel]][]).map(([key, level]) => (
                <div key={key} className={`p-2 rounded-lg border text-center ${level.isFree ? "bg-accent/10 border-accent/30" : "bg-muted border-border"}`}>
                  <p className="font-semibold text-xs">{level.label}</p>
                  {level.isFree && <Badge className="mt-1 bg-accent text-accent-foreground text-[10px] px-1">Free</Badge>}
                </div>
              ))}
            </div>
          </div>

          {/* 5-Layer Structure */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent" />
              5-Layer Course Structure
            </h3>
            <div className="space-y-3">
              {course.layers.map((layer, i) => (
                <div key={layer.id} className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{layer.name}</p>
                    <p className="text-xs text-muted-foreground">{layer.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Paths */}
          {paths.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-accent" />
                Learning Paths
              </h3>
              <div className="space-y-2">
                {paths.map((path) => (
                  <div key={path.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{path.title}</p>
                      <Badge variant="outline" className="text-xs capitalize">{path.skillLevel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{path.targetRole} • {path.estimatedWeeks} weeks</p>
                    {path.capstoneProject && (
                      <p className="text-xs text-premium mt-1">Capstone: {path.capstoneProject}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-2">Course Overview</h3>
            <p className="text-muted-foreground">{course.overview}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">What You'll Learn</h3>
            <ul className="space-y-2">
              {course.whatYouLearn.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Prerequisites</h3>
            <ul className="space-y-2">
              {course.prerequisites.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Entrepreneurial Intelligence Module */}
          {course.entrepreneurialModule && (
            <div className="bg-premium/10 border border-premium/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-premium" />
                {entrepreneurialIntelligenceModule.title}
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Included in all Premium tracks</p>
              <ul className="space-y-1">
                {entrepreneurialIntelligenceModule.topics.map((topic, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-premium mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.responsibleUse && course.responsibleUse.length > 0 && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold">Responsible Use & Cognitive Discipline</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                This course includes guidance on using technology wisely while maintaining independent thinking.
              </p>
              <ul className="space-y-2">
                {course.responsibleUse.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              asChild
              className={course.isPremium ? "flex-1 bg-premium hover:bg-premium/90 text-premium-foreground" : "flex-1 bg-accent hover:bg-accent/90"}
              size="lg"
            >
              <Link to={`/learn/${course.id}`}>Start Foundation (Free)</Link>
            </Button>
            <Button variant="outline" size="lg" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseModal;
