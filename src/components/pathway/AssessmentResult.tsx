import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Sparkles, CheckCircle2, Mail } from "lucide-react";
import LightGuide from "@/components/tutor/LightGuide";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { pillars } from "@/data/courses";
import { derivePathwayProfile, type PathwayProfile } from "@/lib/pathwayProfile";
import type { PIEResult } from "@/data/pathwayIntelligence";
import { z } from "zod";

type Phase = "calculating" | "reveal" | "capture" | "sent";

const leadSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  phone: z.string().trim().min(7, "Phone / WhatsApp number is required").max(30),
  email: z.string().trim().email("Enter a valid email").max(160),
});

interface Props {
  result: PIEResult;
  onRetake: () => void;
}

/** Bar chart row showing one dimension category with its selected value highlighted. */
const DimensionRow = ({
  label,
  options,
  selected,
}: {
  label: string;
  options: string[];
  selected: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <Badge className="bg-accent/10 text-accent border-accent/30 text-xs">{selected}</Badge>
    </div>
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((opt) => (
        <div key={opt} className="space-y-1">
          <div
            className={`h-2 rounded-full ${opt === selected ? "bg-accent" : "bg-muted"}`}
            aria-hidden
          />
          <p
            className={`text-[10px] text-center ${
              opt === selected ? "text-accent font-medium" : "text-muted-foreground"
            }`}
          >
            {opt}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const AssessmentResult = ({ result, onRetake }: Props) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("calculating");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ firstName: "", phone: "", email: "" });

  const profile: PathwayProfile = useMemo(() => derivePathwayProfile(result), [result]);
  const primaryPillar = pillars.find((p) => p.id === profile.primaryPillarId);
  const secondaryPillar = pillars.find((p) => p.id === profile.secondaryPillarId);

  // 1.5s deliberate calculating pause
  useEffect(() => {
    if (phase !== "calculating") return;
    const t = setTimeout(() => setPhase("reveal"), 1500);
    return () => clearTimeout(t);
  }, [phase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please complete the form");
      return;
    }
    setSubmitting(true);
    try {
      // Persist the assessment snapshot so we can insert it once the user is authenticated.
      const snapshot = {
        cognitive_style: profile.cognitiveStyle,
        execution_preference: profile.executionPreference,
        risk_orientation: profile.riskOrientation,
        motivation_driver: profile.motivationDriver,
        primary_pillar_recommended: profile.primaryPillarId,
        secondary_pillar_recommended: profile.secondaryPillarId,
        raw_dimensions: profile.dimensionPercentages,
      };
      localStorage.setItem("genlink_pending_assessment", JSON.stringify(snapshot));

      // Best-effort lead capture.
      await supabase.from("leads").insert({
        email: parsed.data.email,
        source: "pathway-intelligence-engine",
        assessment_snapshot: {
          first_name: parsed.data.firstName,
          phone: parsed.data.phone,
          ...snapshot,
        },
      });

      const redirectTo = `${window.location.origin}/journey?recommended=${profile.primaryPillarId}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: parsed.data.email,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            first_name: parsed.data.firstName,
            phone: parsed.data.phone,
          },
        },
      });
      if (error) throw error;
      setPhase("sent");
    } catch (err: any) {
      console.error("Assessment lead submit failed:", err);
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Phase 1: calculating ──────────────────────────────────────
  if (phase === "calculating") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <LightGuide size={96} intense />
        <p className="text-lg text-muted-foreground animate-pulse">Analysing your profile…</p>
      </div>
    );
  }

  // ── Phase 4: magic-link sent ──────────────────────────────────
  if (phase === "sent") {
    return (
      <Card className="max-w-lg mx-auto text-center border-accent/30">
        <CardHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3">
            <Mail className="w-7 h-7 text-accent" />
          </div>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            We've sent a secure link to <span className="font-medium text-foreground">{form.email}</span>.
            Click it to unlock your journey — your profile and pathway are saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            You can close this tab. We'll also send your personalised pathway to your WhatsApp shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Phase 2 + 3: reveal + capture ────────────────────────────
  return (
    <div className="space-y-8">
      {/* Reveal header */}
      <Card className="border-accent/30 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-accent via-secondary to-accent" />
        <CardHeader className="text-center pb-3">
          <Badge className="mx-auto mb-2 bg-accent/10 text-accent border-accent/30 text-xs">
            Your Pathway Profile
          </Badge>
          <CardTitle className="text-2xl md:text-3xl">You're a {profile.cognitiveStyle}</CardTitle>
          <CardDescription className="text-base mt-2 max-w-xl mx-auto">
            Four dimensions describe how you think, decide and grow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DimensionRow
            label="Cognitive Style"
            options={["Analyst", "Builder", "Connector", "Visionary"]}
            selected={profile.cognitiveStyle}
          />
          <DimensionRow
            label="Execution Preference"
            options={["Systematic", "Instinctive", "Collaborative"]}
            selected={profile.executionPreference}
          />
          <DimensionRow
            label="Risk Orientation"
            options={["Conservative", "Calculated", "Bold"]}
            selected={profile.riskOrientation}
          />
          <DimensionRow
            label="Motivation Driver"
            options={["Security", "Growth", "Impact", "Recognition"]}
            selected={profile.motivationDriver}
          />
        </CardContent>
      </Card>

      {/* Recommended starting point */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground text-center">
          Your recommended starting point:
        </p>

        {primaryPillar && (
          <Card className="border-accent shadow-lg">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ backgroundColor: primaryPillar.color }}
                >
                  {primaryPillar.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <Badge className="mb-1 bg-accent text-accent-foreground text-xs">
                    <Sparkles className="w-3 h-3 mr-1" /> Primary Pillar
                  </Badge>
                  <CardTitle className="text-xl">{primaryPillar.name}</CardTitle>
                  <p className="text-xs text-muted-foreground italic mt-0.5">{primaryPillar.tagline}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/85 leading-relaxed">{profile.primaryReason}</p>
            </CardContent>
          </Card>
        )}

        {secondaryPillar && (
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: secondaryPillar.color }}
                >
                  {secondaryPillar.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Also strong for you
                  </p>
                  <p className="text-sm font-semibold text-foreground">{secondaryPillar.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{profile.secondaryReason}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lead capture */}
      <Card className="border-accent/40 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-lg">Save your profile & unlock your journey</CardTitle>
          <CardDescription>
            Enter your details to save your profile and unlock your journey. We'll also send your
            personalised pathway to your WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="e.g. Amina"
                required
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone / WhatsApp <span className="text-destructive">*</span></Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+254 7xx xxx xxx"
                required
                maxLength={30}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
                maxLength={160}
              />
              <p className="text-[11px] text-muted-foreground">
                We'll send a secure sign-in link to this address so you can save your profile.
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              {submitting ? "Saving…" : "Save My Profile & Begin"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onRetake}
                className="text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                Retake assessment
              </button>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 text-accent" />
                Your answers are only stored after you sign in
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssessmentResult;