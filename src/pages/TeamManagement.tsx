import { useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useDepartmentRole } from "@/hooks/useDepartmentRole";
import { DEPARTMENTS, type DepartmentRole } from "@/lib/ops/departments";
import { GoldParticles } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldCheck, Mail, Loader2 } from "lucide-react";

const ROLE_OPTIONS: (DepartmentRole | "none")[] = [
  "none", "ceo", "ops_manager", "marketing", "curriculum", "digital_services", "finance", "tech",
];

function roleLabel(r: DepartmentRole | "none" | null) {
  if (!r || r === "none") return "None / Student";
  if (r === "ceo") return "CEO";
  return DEPARTMENTS[r as keyof typeof DEPARTMENTS]?.label ?? r;
}

interface RosterRow {
  user_id: string;
  email: string;
  full_name: string | null;
  department_role: DepartmentRole | null;
  is_admin: boolean;
  joined_at: string;
}

export default function TeamManagement() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { departmentRole, loading: deptLoading } = useDepartmentRole();
  const qc = useQueryClient();

  const canManage = isAdmin || departmentRole === "ceo";

  const roster = useQuery({
    queryKey: ["team_roster"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_team_roster");
      if (error) throw error;
      return (data ?? []) as RosterRow[];
    },
    enabled: canManage,
  });

  const pending = useQuery({
    queryKey: ["pending_role_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_role_assignments")
        .select("email, department_role, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { email: string; department_role: DepartmentRole; created_at: string }[];
    },
    enabled: canManage,
  });

  const assign = useMutation({
    mutationFn: async (payload: { target_user_id?: string; target_email?: string; department_role: DepartmentRole | null }) => {
      const { data, error } = await supabase.functions.invoke("manage-team-role", { body: payload });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data;
    },
    onSuccess: (data) => {
      const d = data as { applied?: string };
      toast.success(d?.applied === "pending" ? "Invitation saved — role applies on signup" : "Role updated");
      qc.invalidateQueries({ queryKey: ["team_roster"] });
      qc.invalidateQueries({ queryKey: ["pending_role_assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<DepartmentRole>("marketing");

  const rows = useMemo(() => roster.data ?? [], [roster.data]);

  if (roleLoading || deptLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: "#F9F6F0" }}>Loading…</div>;
  }
  if (!canManage) return <Navigate to="/journey" replace />;

  return (
    <div className="min-h-screen bg-cinematic-surface relative">
      <GoldParticles count={12} opacity={0.07} />
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#C9A84C] text-xs uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> Team Management
            </div>
            <h1 className="h-serif-gold text-3xl md:text-4xl mt-1">Roster & role assignment</h1>
          </div>
          <Link to="/ops-dashboard" className="text-sm text-[#0D2B55] underline">← Back to Ops</Link>
        </div>

        {/* Invite form */}
        <section className="rounded-xl bg-white/90 border p-5 space-y-3">
          <h2 className="font-semibold text-[#0D2B55] flex items-center gap-2">
            <Mail className="w-4 h-4" /> Invite / assign by email
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_auto] gap-3">
            <div>
              <Label className="text-xs text-[#0D2B55]/70">Email</Label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@example.com" className="h-11" />
            </div>
            <div>
              <Label className="text-xs text-[#0D2B55]/70">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as DepartmentRole)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter((r) => r !== "none").map((r) => (
                    <SelectItem key={r} value={r}>{roleLabel(r as DepartmentRole)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="h-11 w-full md:w-auto"
                disabled={!inviteEmail || assign.isPending}
                onClick={() => {
                  assign.mutate({ target_email: inviteEmail.trim(), department_role: inviteRole });
                  setInviteEmail("");
                }}
                style={{ background: "#0D2B55", color: "white" }}
              >
                {assign.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign
              </Button>
            </div>
          </div>
          {pending.data && pending.data.length > 0 && (
            <div className="text-xs text-[#0D2B55]/70 pt-2 border-t">
              <div className="font-semibold mb-1">Pending invitations</div>
              <ul className="space-y-1">
                {pending.data.map((p) => (
                  <li key={p.email} className="flex items-center justify-between">
                    <span>{p.email} → <strong>{roleLabel(p.department_role)}</strong></span>
                    <button className="text-red-700 hover:underline" onClick={() => assign.mutate({ target_email: p.email, department_role: null })}>Revoke</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Roster */}
        <section className="rounded-xl bg-white/90 border overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-[#0D2B55]">Registered users ({rows.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0D2B55]/5 text-[#0D2B55]">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Current role</th>
                  <th className="text-left p-3">Joined</th>
                  <th className="text-left p-3">Assign role</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.user_id} className="border-t">
                    <td className="p-3 text-[#0D2B55]">
                      {u.full_name ?? <span className="text-[#0D2B55]/50 italic">—</span>}
                      {u.is_admin && <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#C9A84C]/20 text-[#8a6a10] font-semibold">ADMIN</span>}
                    </td>
                    <td className="p-3 text-[#0D2B55]/80">{u.email}</td>
                    <td className="p-3">{roleLabel(u.department_role)}</td>
                    <td className="p-3 text-[#0D2B55]/70">{new Date(u.joined_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Select
                        value={u.department_role ?? "none"}
                        onValueChange={(v) =>
                          assign.mutate({ target_user_id: u.user_id, department_role: v === "none" ? null : (v as DepartmentRole) })
                        }
                      >
                        <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-[#0D2B55]/60">No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}