import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ban, RotateCcw, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Participants = () => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newLanguage, setNewLanguage] = useState("python");
  // contests removed - participant is language-scoped now
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchParticipants();
  }, []);

  // contests removed

  const fetchParticipants = async () => {
    setFetchError(null);
    try {
      // First fetch participants with contest info. We avoid relying on PostgREST inferred relationships
      // because the DB may not have an explicit FK between participants.user_id and profiles.user_id.
      const { data: parts, error: partsErr } = await supabase
        .from("participants")
        .select(`*, contests(name)`)
        .order("score", { ascending: false });

      if (partsErr) {
        console.error("Supabase fetchParticipants (participants) error:", partsErr);
        setFetchError(partsErr.message || "Failed to fetch participants");
        toast.error(partsErr.message || "Failed to fetch participants");
        setParticipants([]);
        return;
      }

      const participantsData: any[] = parts || [];

      // Collect unique user_ids and batch fetch profiles
      const userIds = Array.from(new Set(participantsData.map((p) => p.user_id).filter(Boolean)));

      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        if (profilesErr) {
          console.error("Supabase fetchParticipants (profiles) error:", profilesErr);
          // Not fatal: continue with participants but surface the error
          setFetchError(profilesErr.message || "Failed to fetch profiles");
          toast.error(profilesErr.message || "Failed to fetch profiles");
        } else if (profilesData) {
          profilesMap = (profilesData as any[]).reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Attach profiles to participants for UI convenience
      const merged = participantsData.map((p) => ({ ...p, profiles: profilesMap[p.user_id] ?? null }));
      setParticipants(merged);
    } catch (err: any) {
      console.error("Unexpected error fetching participants:", err);
      setFetchError(err?.message || String(err));
      toast.error(err?.message || "Failed to fetch participants");
      setParticipants([]);
    }
  };

  const toggleBlock = async (id: string, currentBlocked: boolean) => {
    const { error } = await supabase
      .from("participants")
      .update({ is_blocked: !currentBlocked })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update participant");
    } else {
      toast.success(`Participant ${!currentBlocked ? "blocked" : "unblocked"}`);
      fetchParticipants();
    }
  };

  const resetProgress = async (id: string) => {
    if (confirm("Are you sure you want to reset this participant's progress?")) {
      const { error } = await supabase
        .from("participants")
        .update({ score: 0, time_taken_seconds: 0, completed_at: null })
        .eq("id", id);

      if (error) {
        toast.error("Failed to reset progress");
      } else {
        toast.success("Progress reset successfully");
        fetchParticipants();
      }
    }
  };

  const resetLanguageForParticipant = async (id: string) => {
    if (!confirm("Reset participant's selected language? They will be able to reselect.")) return;
    const { error } = await supabase.from("participants").update({ selected_language: null }).eq("id", id);
    if (error) {
      toast.error(error.message || "Failed to reset language");
    } else {
      toast.success("Participant language reset. They can now choose again.");
      fetchParticipants();
    }
  };

  const handleAddParticipant = async () => {
    if (!newName || !newEmail || !newPassword) {
      toast.error("Please provide name, email and password");
      return;
    }
    // Try to create an auth user via Supabase client signUp
    const { data: signData, error: signErr } = await supabase.auth.signUp({ email: newEmail, password: newPassword });

    if (signErr) {
      // If signUp failed (email exists etc.), show error and abort
      toast.error(signErr.message || "Failed to create auth user");
      return;
    }

    // Prefer auth user id returned by signUp. If not present (e.g. email confirmation required),
    // fall back to DB-only generated id and inform the admin.
    const authUserId = signData?.user?.id ?? null;
    const userId = authUserId ?? ((typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2));

  // Generate ids required by the DB types and insert profile (link to auth user id when available)
  const profileId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2);
  const { error: pErr } = await supabase.from("profiles").insert([{ id: profileId, user_id: userId, full_name: newName, email: newEmail }]);
    if (pErr) {
      toast.error(pErr.message || "Failed to create profile");
      return;
    }

    // Insert participant row (language-scoped, no contest_id)
    const participantId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2);
    const { error: partErr } = await supabase.from("participants").insert([
      { id: participantId, contest_id: null, user_id: userId, selected_language: newLanguage as "python" | "c" | "java" },
    ]);
    if (partErr) {
      toast.error(partErr.message || "Failed to create participant");
      return;
    }

    if (authUserId) {
      toast.success("Participant account created and linked successfully");
    } else {
      toast.success("Participant added (no auth id returned). If your Supabase project requires email confirmation the user will need to confirm before logging in.");
    }
    setIsAddOpen(false);
    setNewName("");
    setNewEmail("");
    setNewPassword("");
  // contests removed
    setNewLanguage("python");
    fetchParticipants();
  };

  const filteredParticipants = participants.filter((p) => {
    const full = p.profiles?.full_name ?? "";
    const email = p.profiles?.email ?? "";
    const matchesSearch = full.toLowerCase().includes(searchTerm.toLowerCase()) || email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = languageFilter === "all" || p.selected_language === languageFilter;
    return matchesSearch && matchesLanguage;
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Participant Management</h1>
        <p className="text-muted-foreground">View and manage contest participants</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="c">C</SelectItem>
            <SelectItem value="java">Java</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Participant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Participant</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <Input placeholder="Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              {/* contest selection removed - participants are language-scoped */}
              <Select value={newLanguage} onValueChange={setNewLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleAddParticipant}>Add</Button>
                <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {fetchError && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-red-500">Error: {fetchError}</div>
              <div>
                <Button onClick={fetchParticipants}>Retry</Button>
              </div>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
                {/* Contest column removed - participants are language-scoped */}
              <TableHead>Language</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParticipants.map((participant) => (
              <TableRow key={participant.id}>
                <TableCell className="font-medium">{participant.profiles?.full_name ?? "Anonymous"}</TableCell>
                <TableCell>{participant.profiles?.email ?? ""}</TableCell>
                {/* Contest removed - show N/A or omit */}
                <TableCell>
                  <Badge variant="outline">{participant.selected_language ? participant.selected_language.toUpperCase() : "N/A"}</Badge>
                </TableCell>
                <TableCell className="font-bold">{participant.score ?? 0}</TableCell>
                <TableCell>{participant.time_taken_seconds ? Math.floor(participant.time_taken_seconds / 60) : 0}m</TableCell>
                <TableCell>
                  {participant.is_blocked ? (
                    <Badge variant="destructive">Blocked</Badge>
                  ) : participant.completed_at ? (
                    <Badge>Completed</Badge>
                  ) : (
                    <Badge variant="secondary">In Progress</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleBlock(participant.id, participant.is_blocked)}
                      title={participant.is_blocked ? "Unblock" : "Block"}
                    >
                      <Ban className={`h-4 w-4 ${participant.is_blocked ? "text-green-500" : "text-red-500"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => resetProgress(participant.id)}
                      title="Reset Progress"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => resetLanguageForParticipant(participant.id)}
                      title="Reset Language"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
