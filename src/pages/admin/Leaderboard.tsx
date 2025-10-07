import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Trophy, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Leaderboard = () => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [contestTimeLeft, setContestTimeLeft] = useState<number>(0);
  const [contestActive, setContestActive] = useState<boolean>(false);

  useEffect(() => {
    fetchLeaderboard();

    // Set up real-time subscription
    const channel = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // Fetch contest timer
  useEffect(() => {
    const fetchContestTimer = async () => {
      try {
        const { data: contest } = await supabase
          .from("contests")
          .select("status, duration_minutes, start_time")
          .in("status", ["active", "paused"])
          .order("start_time", { ascending: false })
          .limit(1)
          .maybeSingle();
        const isActive = contest?.status === "active";
        setContestActive(Boolean(isActive));
        if (contest?.start_time && contest?.duration_minutes) {
          const startMs = new Date(contest.start_time).getTime();
          const nowMs = Date.now();
          const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
          const remaining = Math.max(0, (contest.duration_minutes * 60) - elapsed);
          setContestTimeLeft(remaining);
        }
      } catch (err) {
        console.error("Failed to fetch contest timer:", err);
      }
    };
    fetchContestTimer();
    const interval = setInterval(fetchContestTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data: parts, error: partsErr } = await supabase
        .from("participants")
        .select("id, user_id, selected_language, score, time_taken_seconds")
        .order("score", { ascending: false })
        .order("time_taken_seconds", { ascending: true });

      if (partsErr) {
        console.error("fetchLeaderboard participants error:", partsErr);
        toast.error(partsErr.message || "Failed to fetch leaderboard");
        setParticipants([]);
        return;
      }

      const participantsData: any[] = parts || [];
      const userIds = Array.from(new Set(participantsData.map((p) => p.user_id).filter(Boolean)));
      const participantIds = Array.from(new Set(participantsData.map((p) => p.id).filter(Boolean)));

      let profilesMap: Record<string, any> = {};
      let bestTimeLeftByParticipant: Record<string, number> = {};
      let submissionsAgg: Record<string, { lastSubmissionAt: string | null; firstCorrectAt: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds);

        if (profilesErr) {
          console.error("fetchLeaderboard profiles error:", profilesErr);
        } else if (profilesData) {
          profilesMap = (profilesData as any[]).reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Compute best time_left from submissions
      if (participantIds.length > 0) {
        const { data: subsData } = await supabase
          .from("submissions")
          .select("participant_id, status, time_left, time_left_seconds")
          .in("participant_id", participantIds);
        (subsData || []).forEach((s: any) => {
          const pid = s.participant_id;
          const t = typeof s.time_left === 'number' ? s.time_left : (typeof s.time_left_seconds === 'number' ? s.time_left_seconds : null);
          if (t == null) return;
          const current = bestTimeLeftByParticipant[pid];
          if (s.status === 'correct') {
            if (current == null || t > current) bestTimeLeftByParticipant[pid] = t;
          } else if (current == null) {
            bestTimeLeftByParticipant[pid] = t;
          }
        });
      }

      const merged = participantsData
        .map((p) => ({
          ...p,
          profiles: profilesMap[p.user_id] ?? null,
          best_time_left: bestTimeLeftByParticipant[p.id] ?? null,
        }))
        .sort((a, b) => {
          if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
          return (b.best_time_left ?? -1) - (a.best_time_left ?? -1);
        });
      setParticipants(merged);
    } catch (err: any) {
      console.error("Unexpected error fetching leaderboard:", err);
      toast.error(err?.message || "Failed to fetch leaderboard");
      setParticipants([]);
    }
  };

  const filteredParticipants = participants.filter(
    (p) => languageFilter === "all" || p.selected_language === languageFilter
  );

  const exportToCSV = () => {
    const headers = ["Rank", "Name", "Email", "Language", "Score", "Time Left (sec)"];
    const rows = filteredParticipants.map((p, index) => [
      index + 1,
      p.profiles?.full_name ?? "Anonymous",
      p.profiles?.email ?? "",
      p.selected_language ?? "",
      p.score ?? 0,
      p.best_time_left ?? "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leaderboard_${new Date().toISOString()}.csv`;
    link.click();
    toast.success("Leaderboard exported");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Leaderboard</h1>
          <p className="text-muted-foreground">Real-time contest rankings</p>
        </div>
        <div className="flex items-center gap-4">
          {contestActive && contestTimeLeft > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
              <Clock className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Contest Time</span>
                <span className="text-lg font-bold font-mono">
                  {String(Math.floor(contestTimeLeft / 60)).padStart(2, "0")}:
                  {String(contestTimeLeft % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-4">
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
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rank</TableHead>
              <TableHead>Participant</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Time Left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParticipants.map((participant, index) => (
              <TableRow key={participant.id} className={index < 3 ? "bg-accent" : ""}>
                <TableCell className="font-bold">
                  <div className="flex items-center gap-2">
                    {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                    {index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                    {index === 2 && <Trophy className="h-5 w-5 text-amber-600" />}
                    #{index + 1}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{participant.profiles?.full_name ?? "Anonymous"}</TableCell>
                <TableCell>{participant.profiles?.email ?? ""}</TableCell>
                <TableCell>
                  <Badge variant="outline">{participant.selected_language ? participant.selected_language.toUpperCase() : "N/A"}</Badge>
                </TableCell>
                <TableCell className="text-2xl font-bold text-primary">{participant.score ?? 0}</TableCell>
                <TableCell>{participant.best_time_left != null ? `${participant.best_time_left}s` : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
