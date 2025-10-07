import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Questions = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [formData, setFormData] = useState<{
    title: string;
    language: "python" | "c" | "java";
    difficulty: "easy" | "medium" | "hard";
    problem_statement: string;
    hint: string;
    faulty_code: string;
    correct_code: string;
    test_cases: string;
    points: number;
    enabled: boolean;
  }>({
    title: "",
    language: "python",
    difficulty: "easy",
    problem_statement: "",
    hint: "",
    faulty_code: "",
    correct_code: "",
    test_cases: "[]",
    points: 10,
    enabled: true,
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch questions");
    } else {
      setQuestions(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      test_cases: JSON.parse(formData.test_cases),
      created_by: user?.id,
    };

    if (selectedQuestion) {
      const { error } = await supabase
        .from("questions")
        .update(payload)
        .eq("id", selectedQuestion.id);

      if (error) {
        toast.error("Failed to update question");
      } else {
        toast.success("Question updated successfully");
        setIsDialogOpen(false);
        fetchQuestions();
      }
    } else {
      const { error } = await supabase.from("questions").insert([payload]);

      if (error) {
        toast.error("Failed to create question");
      } else {
        toast.success("Question created successfully");
        setIsDialogOpen(false);
        fetchQuestions();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      const { error } = await supabase.from("questions").delete().eq("id", id);

      if (error) {
        toast.error("Failed to delete question");
      } else {
        toast.success("Question deleted successfully");
        fetchQuestions();
      }
    }
  };

  const toggleEnabled = async (id: string, currentEnabled: boolean) => {
    const { error } = await supabase
      .from("questions")
      .update({ enabled: !currentEnabled })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update question status");
    } else {
      toast.success(`Question ${!currentEnabled ? "enabled" : "disabled"}`);
      fetchQuestions();
    }
  };

  const openDialog = (question?: any) => {
    if (question) {
      setSelectedQuestion(question);
      setFormData({
        title: question.title,
        language: question.language,
        difficulty: question.difficulty,
        problem_statement: question.problem_statement,
        hint: question.hint || "",
        faulty_code: question.faulty_code,
        correct_code: question.correct_code,
        test_cases: JSON.stringify(question.test_cases, null, 2),
        points: question.points,
        enabled: question.enabled,
      });
    } else {
      setSelectedQuestion(null);
      setFormData({
        title: "",
        language: "python",
        difficulty: "easy",
        problem_statement: "",
        hint: "",
        faulty_code: "",
        correct_code: "",
        test_cases: "[]",
        points: 10,
        enabled: true,
      });
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Management</h1>
          <p className="text-muted-foreground">Manage coding questions for contests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Question Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value as "python" | "c" | "java" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="c">C</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value as "easy" | "medium" | "hard" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (10 pts)</SelectItem>
                    <SelectItem value="medium">Medium (20 pts)</SelectItem>
                    <SelectItem value="hard">Hard (30 pts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Problem Statement"
                value={formData.problem_statement}
                onChange={(e) => setFormData({ ...formData, problem_statement: e.target.value })}
                rows={4}
                required
              />
              <Textarea
                placeholder="Hint (optional)"
                value={formData.hint}
                onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                rows={2}
              />
              <Textarea
                placeholder="Faulty Code"
                value={formData.faulty_code}
                onChange={(e) => setFormData({ ...formData, faulty_code: e.target.value })}
                rows={6}
                className="font-mono text-sm"
                required
              />
              <Textarea
                placeholder="Correct Code"
                value={formData.correct_code}
                onChange={(e) => setFormData({ ...formData, correct_code: e.target.value })}
                rows={6}
                className="font-mono text-sm"
                required
              />
              <Textarea
                placeholder='Test Cases (JSON format: [{"input": "...", "expected": "..."}])'
                value={formData.test_cases}
                onChange={(e) => setFormData({ ...formData, test_cases: e.target.value })}
                rows={4}
                className="font-mono text-sm"
                required
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
                <span className="text-sm">Enable for contests</span>
              </div>
              <Button type="submit" className="w-full">
                {selectedQuestion ? "Update Question" : "Create Question"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell className="font-medium">{question.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{question.language.toUpperCase()}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      question.difficulty === "easy"
                        ? "default"
                        : question.difficulty === "medium"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {question.difficulty}
                  </Badge>
                </TableCell>
                <TableCell>{question.points}</TableCell>
                <TableCell>
                  <Switch
                    checked={question.enabled}
                    onCheckedChange={() => toggleEnabled(question.id, question.enabled)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(question)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(question.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
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
