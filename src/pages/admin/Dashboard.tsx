import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Trophy, FileQuestion, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalParticipants: 0,
    activeContests: 0,
    totalQuestions: 0,
    totalSubmissions: 0,
  });
  const [topParticipants, setTopParticipants] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Fetch stats
    const [participants, contests, questions, submissions] = await Promise.all([
      supabase.from("participants").select("id", { count: "exact", head: true }),
      supabase.from("contests").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("submissions").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalParticipants: participants.count || 0,
      activeContests: contests.count || 0,
      totalQuestions: questions.count || 0,
      totalSubmissions: submissions.count || 0,
    });

    // Fetch top 3 participants
    const { data: topData } = await supabase
      .from("participants")
      .select(`
        *,
        profiles:user_id (full_name, email)
      `)
      .order("score", { ascending: false })
      .limit(3);

    setTopParticipants(topData || []);
  };

  const statCards = [
    { icon: Users, label: "Total Participants", value: stats.totalParticipants, color: "text-blue-500" },
    { icon: Trophy, label: "Active Contests", value: stats.activeContests, color: "text-yellow-500" },
    { icon: FileQuestion, label: "Total Questions", value: stats.totalQuestions, color: "text-purple-500" },
    { icon: Code2, label: "Total Submissions", value: stats.totalSubmissions, color: "text-green-500" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your coding contest platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <Icon className={`h-12 w-12 ${stat.color}`} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Top Performers */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Top 3 Performers</h2>
        <div className="space-y-4">
          {topParticipants.length === 0 ? (
            <p className="text-muted-foreground">No participants yet</p>
          ) : (
            topParticipants.map((participant, index) => (
              <div key={participant.id} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-amber-600"
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{participant.profiles?.full_name || "Anonymous"}</p>
                    <p className="text-sm text-muted-foreground">{participant.profiles?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{participant.score}</p>
                  <p className="text-sm text-muted-foreground">points</p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
