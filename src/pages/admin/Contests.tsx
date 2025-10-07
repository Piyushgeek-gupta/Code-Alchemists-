import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Play, Pause, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Contests = () => {
  const [contests, setContests] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    duration_minutes: number;
    status: "scheduled" | "active" | "paused" | "completed";
  }>({
    name: "",
    description: "",
    duration_minutes: 30,
    status: "scheduled",
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    const { data, error } = await supabase
      .from("contests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch contests");
    } else {
      setContests(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("contests").insert([{
      ...formData,
      created_by: user?.id,
    }]);

    if (error) {
      toast.error("Failed to create contest");
    } else {
      toast.success("Contest created successfully");
      setIsDialogOpen(false);
      fetchContests();
      setFormData({
        name: "",
        description: "",
        duration_minutes: 30,
        status: "scheduled",
      });
    }
  };

  const updateContestStatus = async (id: string, status: "scheduled" | "active" | "paused" | "completed") => {
    const { error } = await supabase
      .from("contests")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update contest status");
    } else {
      toast.success(`Contest ${status}`);
      fetchContests();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      scheduled: "secondary",
      active: "default",
      paused: "secondary",
      completed: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contest Management</h1>
          <p className="text-muted-foreground">Create and manage coding contests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Contest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Contest</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Contest Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
              <Input
                type="number"
                placeholder="Duration (minutes)"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                required
              />
              <Button type="submit" className="w-full">
                Create Contest
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contests.map((contest) => (
              <TableRow key={contest.id}>
                <TableCell className="font-medium">{contest.name}</TableCell>
                <TableCell>{contest.duration_minutes} min</TableCell>
                <TableCell>{getStatusBadge(contest.status)}</TableCell>
                <TableCell>{new Date(contest.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {contest.status !== "active" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateContestStatus(contest.id, "active")}
                        title="Start Contest"
                      >
                        <Play className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                    {contest.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateContestStatus(contest.id, "paused")}
                        title="Pause Contest"
                      >
                        <Pause className="h-4 w-4 text-yellow-500" />
                      </Button>
                    )}
                    {(contest.status === "active" || contest.status === "paused") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateContestStatus(contest.id, "completed")}
                        title="End Contest"
                      >
                        <StopCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
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
