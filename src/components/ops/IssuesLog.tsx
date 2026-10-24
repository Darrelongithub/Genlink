import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, PlusCircle, Loader2 } from "lucide-react";
import { DEPARTMENTS, DEPARTMENT_ORDER, type DepartmentRole } from "@/lib/ops/departments";
import { DepartmentBadge } from "./shared";

const PRIORITY_COLORS: Record<string, string> = { high: "#D33232", medium: "#E0A200", low: "#0E7A8A" };

export default function IssuesLog({ canEdit }: { canEdit: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigned, setAssigned] = useState<DepartmentRole | "">("");
  const [priority, setPriority] = useState<"high"|"medium"|"low">("medium");

  const issues = useQuery({
    queryKey: ["issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .order("resolved_at", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!title.trim()) throw new Error("Title is required");
      const { error } = await supabase.from("issues").insert({
        title: title.trim(),
        description: description.trim() || null,
        assigned_department: (assigned || null) as DepartmentRole | null,
        priority,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Issue logged.");
      setTitle(""); setDescription(""); setAssigned(""); setPriority("medium");
      qc.invalidateQueries({ queryKey: ["issues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("issues").update({ resolved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["issues"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="font-semibold text-[#0D2B55] flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Log a new issue
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
            </div>
            <div>
              <Label className="text-xs">Assigned department</Label>
              <Select value={assigned} onValueChange={(v) => setAssigned(v as DepartmentRole)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_ORDER.map((r) => (
                    <SelectItem key={r} value={r}>{DEPARTMENTS[r].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} />
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "high"|"medium"|"low")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => add.mutate()}
                disabled={add.isPending}
                style={{ background: "#0D2B55" }}
                className="text-white w-full"
              >
                {add.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Log issue
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0D2B5508] text-[#0D2B55]">
            <tr>
              <th className="text-left p-3">Issue</th>
              <th className="text-left p-3 hidden md:table-cell">Assigned</th>
              <th className="text-left p-3">Priority</th>
              <th className="text-left p-3 hidden md:table-cell">Logged</th>
              <th className="text-right p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {issues.data?.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-[#0D2B55]/60">No issues logged.</td></tr>
            )}
            {issues.data?.map((i) => {
              const resolved = !!i.resolved_at;
              return (
                <tr key={i.id} className={`border-t ${resolved ? "opacity-60" : ""}`}>
                  <td className="p-3">
                    <div className="font-medium text-[#0D2B55]">{i.title}</div>
                    {i.description && <div className="text-xs text-[#0D2B55]/70 mt-0.5">{i.description}</div>}
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    {i.assigned_department ? <DepartmentBadge role={i.assigned_department as DepartmentRole} /> : "—"}
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-semibold uppercase" style={{ color: PRIORITY_COLORS[i.priority] }}>
                      {i.priority}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell text-xs text-[#0D2B55]/70">
                    {new Date(i.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    {resolved ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[#12A150]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                      </span>
                    ) : canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => resolve.mutate(i.id)}
                        disabled={resolve.isPending}
                      >
                        Mark resolved
                      </Button>
                    ) : (
                      <span className="text-xs text-[#0D2B55]/60">Open</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}