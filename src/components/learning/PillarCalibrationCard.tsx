import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import type { Unit } from "@/hooks/useUnits";

/**
 * Optional 3-question calibration shown at the top of a pillar's learning
 * view. Never gates content. On complete → picks a recommended starting
 * unit. On skip/dismiss → the row is written with `dismissed_at` so this
 * card never returns for the same user+pillar.
 */

interface Props {
  pillarId: string;
  units: Unit[];
  /** Called when the calibration picks a recommended unit id. */
  onRecommendedUnitId?: (unitId: string | null) => void;
}

type Answer = 0 | 1 | 2;

const questions: { q: string; options: string[] }[] = [
  {
    q: "How familiar are you with this area already?",
    options: ["Total beginner", "Some exposure", "Confident — just want depth"],
  },
  {
    q: "How much time can you commit each week?",
    options: ["Under 2 hours", "2–5 hours", "5+ hours"],
  },
  {
    q: "What matters most right now?",
    options: ["Understand the fundamentals", "Build something practical", "Reach mastery for work"],
  },
];

export default function PillarCalibrationCard({ pillarId, units, onRecommendedUnitId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["pillar_calibration", user?.id, pillarId],
    enabled: !!user && !!pillarId,
    queryFn: async () => {
      const { data } = await supabase
        .from("pillar_calibrations")
        .select("*")
        .eq("user_id", user!.id)
        .eq("pillar_id", pillarId)
        .maybeSingle();
      if (data?.recommended_unit_id) onRecommendedUnitId?.(data.recommended_unit_id);
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (payload: { dismissed: boolean; answers?: Answer[] }) => {
      if (!user) return;
      const learningPathUnits = units
        .filter((u) => u.track_type === "learning_path")
        .sort((a, b) => a.order_index - b.order_index);
      let recommendedUnitId: string | null = null;
      if (!payload.dismissed && payload.answers && learningPathUnits.length > 0) {
        // Sum of answers (0..6) → map into unit index (start earlier for beginners)
        const total = payload.answers.reduce<number>((a, b) => a + b, 0);
        const idx = Math.min(learningPathUnits.length - 1, Math.round((total / 6) * (learningPathUnits.length - 1)));
        recommendedUnitId = learningPathUnits[idx]?.id ?? null;
      }
      await supabase.from("pillar_calibrations").upsert(
        {
          user_id: user.id,
          pillar_id: pillarId,
          answers: payload.answers ?? [],
          recommended_unit_id: recommendedUnitId,
          dismissed_at: payload.dismissed ? new Date().toISOString() : null,
          completed_at: payload.dismissed ? null : new Date().toISOString(),
        },
        { onConflict: "user_id,pillar_id" },
      );
      return recommendedUnitId;
    },
    onSuccess: (recId) => {
      onRecommendedUnitId?.(recId ?? null);
      qc.invalidateQueries({ queryKey: ["pillar_calibration", user?.id, pillarId] });
    },
  });

  if (!user || isLoading || existing) return null;

  const answer = (v: Answer) => {
    const next = [...answers, v] as Answer[];
    setAnswers(next);
    if (step === questions.length - 1) {
      save.mutate({ dismissed: false, answers: next });
    } else {
      setStep(step + 1);
    }
  };

  return (
    <Card className="border-accent/30 bg-accent/5 relative overflow-hidden">
      <button
        aria-label="Dismiss calibration"
        onClick={() => save.mutate({ dismissed: true })}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1"
      >
        <X className="w-4 h-4" />
      </button>
      <CardContent className="py-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              New here? Answer 3 quick questions to personalise your starting point.
            </p>
            <p className="text-xs text-muted-foreground">
              Optional — every unit stays fully unlocked either way.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            <span className="text-muted-foreground">{step + 1}/{questions.length} · </span>
            {questions[step].q}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {questions[step].options.map((opt, i) => (
              <Button
                key={opt}
                variant="outline"
                size="sm"
                className="flex-1 justify-start whitespace-normal text-left h-auto py-2"
                disabled={save.isPending}
                onClick={() => answer(i as Answer)}
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => save.mutate({ dismissed: true })}
            className="text-muted-foreground"
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}