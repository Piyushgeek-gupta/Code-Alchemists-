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
    const { data, error } = await supabase
      .from("submissions")
      .select(`
        *,
        participants (
          profiles:user_id (full_name, email)
        ),
        questions (title, language)
      `)
      .order("submitted_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch submissions");
    } else {
      setSubmissions(data || []);
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
                  {submission.participants?.profiles?.full_name || "Anonymous"}
                </TableCell>
                <TableCell>{submission.questions?.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{submission.questions?.language.toUpperCase()}</Badge>
                </TableCell>
                <TableCell>{getStatusBadge(submission.status)}</TableCell>
                <TableCell className="font-bold">{submission.points_awarded}</TableCell>
                <TableCell>{submission.attempt_number}</TableCell>
                <TableCell>{new Date(submission.submitted_at).toLocaleString()}</TableCell>
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
                      {submission.execution_output && (
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
