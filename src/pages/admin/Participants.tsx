import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ban, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Participants = () => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("participants")
      .select(`
        *,
        profiles:user_id (full_name, email),
        contests (name)
      `)
      .order("score", { ascending: false });

    if (error) {
      toast.error("Failed to fetch participants");
    } else {
      setParticipants(data || []);
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

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch = p.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Contest</TableHead>
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
                <TableCell className="font-medium">{participant.profiles?.full_name || "Anonymous"}</TableCell>
                <TableCell>{participant.profiles?.email}</TableCell>
                <TableCell>{participant.contests?.name || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{participant.selected_language?.toUpperCase()}</Badge>
                </TableCell>
                <TableCell className="font-bold">{participant.score}</TableCell>
                <TableCell>{Math.floor(participant.time_taken_seconds / 60)}m</TableCell>
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
