import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Code2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Submissions = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedCode, setSelectedCode] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      // Directly fetch tables since policies are open for SELECT
      const { data: subs, error: subsErr } = await supabase
        .from("submissions")
        .select("id, participant_id, question_id, submitted_code, status, points_awarded, attempt_number, submitted_at, execution_output")
        .order("submitted_at", { ascending: false });

      if (subsErr) {
        console.error("fetchSubmissions submissions error:", subsErr);
        toast.error(subsErr.message || "Failed to fetch submissions");
        setSubmissions([]);
        return;
      }

      const submissionsData: any[] = subs || [];
      const participantIds = Array.from(new Set(submissionsData.map((s) => s.participant_id).filter(Boolean)));
      const questionIds = Array.from(new Set(submissionsData.map((s) => s.question_id).filter(Boolean)));

      let participantsMap: Record<string, any> = {};
      if (participantIds.length > 0) {
        const { data: partsData } = await supabase
          .from("participants")
          .select("id, user_id")
          .in("id", participantIds);
        const userIds = Array.from(new Set((partsData || []).map((p: any) => p.user_id).filter(Boolean)));
        const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
        const profilesMap = (profilesData || []).reduce((acc: Record<string, any>, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>);
        (partsData || []).forEach((p: any) => {
          participantsMap[p.id] = { ...p, profiles: profilesMap[p.user_id] ?? null };
        });
      }

      let questionsMap: Record<string, any> = {};
      if (questionIds.length > 0) {
        const { data: questionsData } = await supabase.from("questions").select("id, title, language, points").in("id", questionIds);
        (questionsData || []).forEach((q: any) => (questionsMap[q.id] = q));
      }

      const merged = submissionsData.map((s) => ({
        ...s,
        participants: participantsMap[s.participant_id] ?? null,
        questions: questionsMap[s.question_id] ?? null,
      }));

      setSubmissions(merged);
    } catch (err: any) {
      console.error("Unexpected error fetching submissions:", err);
      toast.error(err?.message || "Failed to fetch submissions");
      setSubmissions([]);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      correct: "default",
      incorrect: "destructive",
      pending: "secondary",
      error: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Code Submissions</h1>
        <p className="text-muted-foreground">Review participant code submissions</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
            <TableHead>Question</TableHead>
            <TableHead>Q#</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell className="font-medium">
                  {submission.participants?.profiles?.full_name ?? "Anonymous"}
                </TableCell>
                <TableCell>{submission.questions?.title}</TableCell>
                <TableCell>{submission.questions?.id ? String(submission.questions.id).slice(0, 8) : '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{submission.questions?.language ? submission.questions.language.toUpperCase() : "N/A"}</Badge>
                </TableCell>
                <TableCell>{getStatusBadge(submission.status)}</TableCell>
                <TableCell className="font-bold">{submission.points_awarded}</TableCell>
                <TableCell>{submission.attempt_number}</TableCell>
                <TableCell>{submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "-"}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedCode(submission.submitted_code)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Submitted Code</DialogTitle>
                      </DialogHeader>
                      <div className="bg-accent p-4 rounded-lg">
                        <pre className="text-sm overflow-auto max-h-[500px]">
                          <code>{selectedCode}</code>
                        </pre>
                      </div>
                      {submission.questions && (
                        <div className="mt-4 space-y-2">
                          <h3 className="font-semibold">Question Details</h3>
                          <div className="text-sm">Points: {submission.questions.points ?? '-'}</div>
                          <div className="text-sm">Problem:</div>
                          <div className="bg-accent p-3 rounded text-sm whitespace-pre-wrap">N/A in view</div>
                        </div>
                      )}
                      {submission.execution_output && submission.execution_output.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Execution Output:</h3>
                          <div className="bg-accent p-4 rounded-lg">
                            <pre className="text-sm">{submission.execution_output}</pre>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
