import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RotateCcw, Zap, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DragDropItem {
  id: string;
  text: string;
  category: string;
}

interface DragDropExerciseProps {
  title: string;
  description: string;
  items: DragDropItem[];
  categories: { id: string; name: string; description?: string }[];
  xpReward: number;
  onComplete: (score: number) => void;
}

const DragDropExercise = ({
  title,
  description,
  items,
  categories,
  xpReward,
  onComplete,
}: DragDropExerciseProps) => {
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const unplacedItems = items.filter(item => !placements[item.id]);

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (categoryId: string) => {
    if (draggedItem) {
      setPlacements(prev => ({ ...prev, [draggedItem]: categoryId }));
      setDraggedItem(null);
    }
  };

  const handleRemove = (itemId: string) => {
    setPlacements(prev => {
      const newPlacements = { ...prev };
      delete newPlacements[itemId];
      return newPlacements;
    });
  };

  const handleSubmit = () => {
    const newResults: Record<string, boolean> = {};
    let correctCount = 0;

    items.forEach(item => {
      const isCorrect = placements[item.id] === item.category;
      newResults[item.id] = isCorrect;
      if (isCorrect) correctCount++;
    });

    setResults(newResults);
    setIsSubmitted(true);

    const score = Math.round((correctCount / items.length) * 100);
    if (score >= 80) {
      onComplete(score);
    }
  };

  const handleReset = () => {
    setPlacements({});
    setResults({});
    setIsSubmitted(false);
  };

  const allItemsPlaced = Object.keys(placements).length === items.length;
  const correctCount = Object.values(results).filter(Boolean).length;
  const score = items.length > 0 ? Math.round((correctCount / items.length) * 100) : 0;
  const passed = isSubmitted && score >= 80;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-accent" />
              {title}
            </CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-accent" />
            +{xpReward} XP
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Unplaced items pool */}
        <div className="p-4 bg-muted/50 rounded-lg min-h-[80px]">
          <p className="text-sm text-muted-foreground mb-3">Drag items to the correct category:</p>
          <div className="flex flex-wrap gap-2">
            {unplacedItems.map(item => (
              <div
                key={item.id}
                draggable={!isSubmitted}
                onDragStart={() => handleDragStart(item.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "px-3 py-2 bg-card border rounded-lg cursor-grab active:cursor-grabbing transition-all",
                  "hover:shadow-md hover:border-accent/50",
                  draggedItem === item.id && "opacity-50 scale-95",
                  isSubmitted && "cursor-default"
                )}
              >
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
            {unplacedItems.length === 0 && !isSubmitted && (
              <p className="text-sm text-muted-foreground italic">All items placed!</p>
            )}
          </div>
        </div>

        {/* Categories drop zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(category => {
            const categoryItems = items.filter(item => placements[item.id] === category.id);
            
            return (
              <div
                key={category.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(category.id)}
                className={cn(
                  "p-4 border-2 border-dashed rounded-lg transition-all min-h-[120px]",
                  draggedItem && "border-accent bg-accent/5",
                  !draggedItem && "border-border"
                )}
              >
                <h4 className="font-semibold text-foreground mb-1">{category.name}</h4>
                {category.description && (
                  <p className="text-xs text-muted-foreground mb-3">{category.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {categoryItems.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        "px-3 py-2 rounded-lg flex items-center gap-2 text-sm",
                        isSubmitted && results[item.id] && "bg-accent/20 border border-accent",
                        isSubmitted && !results[item.id] && "bg-destructive/20 border border-destructive",
                        !isSubmitted && "bg-secondary/20 border border-secondary/50"
                      )}
                    >
                      <span>{item.text}</span>
                      {isSubmitted ? (
                        results[item.id] ? (
                          <CheckCircle2 className="w-4 h-4 text-accent" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )
                      ) : (
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Results and actions */}
        {isSubmitted && (
          <div className={cn(
            "p-4 rounded-lg",
            passed ? "bg-accent/10 border border-accent/30" : "bg-destructive/10 border border-destructive/30"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {passed ? (
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive" />
                )}
                <div>
                  <p className="font-semibold">
                    {passed ? "Great job!" : "Keep practicing!"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You got {correctCount} out of {items.length} correct ({score}%)
                  </p>
                </div>
              </div>
              {passed && (
                <Badge className="bg-accent text-accent-foreground">
                  +{xpReward} XP Earned!
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!isSubmitted ? (
            <Button 
              onClick={handleSubmit} 
              disabled={!allItemsPlaced}
              className="flex-1 bg-accent hover:bg-accent/90"
            >
              Check Answers
            </Button>
          ) : (
            <Button onClick={handleReset} variant="outline" className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DragDropExercise;
