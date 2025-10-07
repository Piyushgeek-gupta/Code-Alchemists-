import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Announcements = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [selectedContest, setSelectedContest] = useState("");
  const [message, setMessage] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchContests();
    fetchAnnouncements();
  }, []);

  const fetchContests = async () => {
    const { data } = await supabase
      .from("contests")
      .select("id, name")
      .eq("status", "active");
    setContests(data || []);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select(`
        *,
        contests (name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch announcements");
    } else {
      setAnnouncements(data || []);
    }
  };

  const handleSend = async () => {
    if (!selectedContest || !message) {
      toast.error("Please select a contest and enter a message");
      return;
    }

    const { error } = await supabase.from("announcements").insert([
      {
        contest_id: selectedContest,
        message,
        sent_by: user?.id,
      },
    ]);

    if (error) {
      toast.error("Failed to send announcement");
    } else {
      toast.success("Announcement sent successfully");
      setMessage("");
      fetchAnnouncements();
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Announcements</h1>
        <p className="text-muted-foreground">Send live messages to contest participants</p>
      </div>

      {/* Send Announcement */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Send New Announcement</h2>
        <Select value={selectedContest} onValueChange={setSelectedContest}>
          <SelectTrigger>
            <SelectValue placeholder="Select contest" />
          </SelectTrigger>
          <SelectContent>
            {contests.map((contest) => (
              <SelectItem key={contest.id} value={contest.id}>
                {contest.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Type your announcement message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <Button onClick={handleSend} className="w-full">
          <Send className="h-4 w-4 mr-2" />
          Send Announcement
        </Button>
      </Card>

      {/* Announcement History */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Announcement History</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contest</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell className="font-medium">{announcement.contests?.name}</TableCell>
                  <TableCell>{announcement.message}</TableCell>
                  <TableCell>{new Date(announcement.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
