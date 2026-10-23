import { useTiers, tierFor } from "@/hooks/usePlatformXp";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StickyNav from "@/components/StickyNav";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, useAchievementCount } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoldParticles, Reveal } from "@/components/motion";
import { getPillarById } from "@/data/courses";
import { Award, User, Mail, Phone, Sparkles, Target, ArrowRight } from "lucide-react";

interface ProfileRow {
  full_name: string | null;
  phone: string | null;
  department_role: string | null;
}
interface AssessmentRow {
  primary_pillar_recommended: string | null;
  secondary_pillar_recommended: string | null;
  cognitive_style: string | null;
  motivation_driver: string | null;
}
interface XPRow { total_xp: number | null; }

export default function Profile() {
  const { user } = useAuth();
  const { roleLabel, isDepartmentMember, isAdmin } = useUserRole();
  const { data: badgeCount = 0 } = useAchievementCount();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [assessment, setAssessment] = useState<AssessmentRow | null>(null);
  const [xp, setXp] = useState<XPRow | null>(null);
  const { data: tiers } = useTiers();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: a }, { data: x }] = await Promise.all([
        supabase.from("profiles").select("full_name,phone,department_role").eq("user_id", user.id).maybeSingle(),
        supabase.from("assessment_results").select("primary_pillar_recommended,secondary_pillar_recommended,cognitive_style,motivation_driver").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("user_xp").select("total_xp").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(p as any);
      setAssessment(a as any);
      setXp(x as any);
    })();
  }, [user]);

  const primary = assessment?.primary_pillar_recommended ? getPillarById(assessment.primary_pillar_recommended) : null;
  const secondary = assessment?.secondary_pillar_recommended ? getPillarById(assessment.secondary_pillar_recommended) : null;

  return (
    <div className="min-h-screen bg-cinematic-surface relative">
      <GoldParticles count={14} opacity={0.07} />
      <StickyNav />
      <div className="container mx-auto px-4 py-10 max-w-4xl relative">
        <Reveal>
          <h1 className="h-serif-gold text-3xl md:text-4xl mb-6">My Profile</h1>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          <Reveal index={0}>
            <Card className="card-cinematic">
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-4 h-4 text-[#C9A84C]" /> Identity</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> {profile?.full_name ?? "—"}</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {user?.email}</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {profile?.phone ?? "Not provided"}</div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{roleLabel}</Badge>
                  {isAdmin && <Badge className="bg-[#C9A84C] text-[#0F1B33]">Admin</Badge>}
                  {isDepartmentMember && <Badge className="bg-[#0D2B55] text-white">Team</Badge>}
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal index={1}>
            <Card className="card-cinematic">
              <CardHeader><CardTitle className="flex items-center gap-2"><Award className="w-4 h-4 text-[#C9A84C]" /> Progress</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span>Total XP</span><span className="tabular-nums font-semibold">{xp?.total_xp ?? 0}</span></div>
                <div className="flex items-center justify-between"><span>Mastery Tier</span><span className="font-semibold capitalize">{tierFor(xp?.total_xp ?? 0, tiers) ?? "—"}</span></div>
                <div className="flex items-center justify-between"><span>Badges Earned</span><span className="tabular-nums font-semibold">{badgeCount}</span></div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal index={2}>
            <Card className="card-cinematic md:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#C9A84C]" /> Assessment Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!assessment ? (
                  <p className="text-muted-foreground">You haven't completed the Pathway Intelligence assessment yet.
                    <Link to="/pathway-intelligence" className="ml-2 text-[#C9A84C] underline">Take it now</Link>
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div><div className="text-xs uppercase tracking-wider text-muted-foreground">Cognitive Style</div><div className="font-medium capitalize">{assessment.cognitive_style ?? "—"}</div></div>
                      <div><div className="text-xs uppercase tracking-wider text-muted-foreground">Motivation</div><div className="font-medium capitalize">{assessment.motivation_driver ?? "—"}</div></div>
                    </div>
                    <div className="pt-3 border-t space-y-2">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Recommended Pillars</div>
                      {primary && (
                        <Link to={`/pillar/${primary.id}`} className="flex items-center justify-between p-3 rounded-lg border card-cinematic">
                          <div><div className="text-xs text-[#C9A84C] font-semibold">Primary</div><div className="font-semibold">{primary.name}</div></div>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                      {secondary && (
                        <Link to={`/pillar/${secondary.id}`} className="flex items-center justify-between p-3 rounded-lg border">
                          <div><div className="text-xs text-muted-foreground font-semibold">Secondary</div><div className="font-medium">{secondary.name}</div></div>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}