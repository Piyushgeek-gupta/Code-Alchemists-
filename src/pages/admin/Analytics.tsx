import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, Clock, Target } from "lucide-react";

export const Analytics = () => {
  const [stats, setStats] = useState({
    totalParticipants: 0,
    activeParticipants: 0,
    averageScore: 0,
    averageTime: 0,
    questionStats: [] as any[],
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: participants } = await supabase
      .from("participants")
      .select("score, time_taken_seconds, completed_at");

    const totalParticipants = participants?.length || 0;
    const activeParticipants = participants?.filter(p => !p.completed_at).length || 0;
    const avgScore = participants?.reduce((sum, p) => sum + p.score, 0) / totalParticipants || 0;
    const avgTime = participants?.reduce((sum, p) => sum + p.time_taken_seconds, 0) / totalParticipants || 0;

    const { data: submissions } = await supabase
      .from("submissions")
      .select(`
        question_id,
        status,
        questions (title, difficulty, points)
      `);

    const questionStatsMap = new Map();
    submissions?.forEach((sub) => {
      const qId = sub.question_id;
      if (!questionStatsMap.has(qId)) {
        questionStatsMap.set(qId, {
          title: sub.questions?.title,
          difficulty: sub.questions?.difficulty,
          points: sub.questions?.points,
          total: 0,
          correct: 0,
          incorrect: 0,
        });
      }
      const stat = questionStatsMap.get(qId);
      stat.total++;
      if (sub.status === "correct") stat.correct++;
      if (sub.status === "incorrect") stat.incorrect++;
    });

    setStats({
      totalParticipants,
      activeParticipants,
      averageScore: Math.round(avgScore),
      averageTime: Math.round(avgTime / 60),
      questionStats: Array.from(questionStatsMap.values()),
    });
  };

  const statCards = [
    { icon: Users, label: "Total Participants", value: stats.totalParticipants, color: "text-blue-500" },
    { icon: Target, label: "Active Now", value: stats.activeParticipants, color: "text-green-500" },
    { icon: BarChart3, label: "Avg Score", value: stats.averageScore, color: "text-purple-500" },
    { icon: Clock, label: "Avg Time (min)", value: stats.averageTime, color: "text-yellow-500" },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics & Insights</h1>
        <p className="text-muted-foreground">Contest performance and statistics</p>
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

      {/* Question Performance */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Question Performance</h2>
        <div className="space-y-4">
          {stats.questionStats.map((q, index) => (
            <div key={index} className="p-4 bg-accent rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold">{q.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {q.difficulty} • {q.points} points
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0}%
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-500">✓ {q.correct} correct</span>
                <span className="text-red-500">✗ {q.incorrect} incorrect</span>
                <span className="text-muted-foreground">Total: {q.total}</span>
              </div>
            </div>
          ))}
          {stats.questionStats.length === 0 && (
            <p className="text-muted-foreground">No submission data yet</p>
          )}
        </div>
      </Card>
    </div>
  );
};
