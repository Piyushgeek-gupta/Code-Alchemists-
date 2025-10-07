import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Code2, Clock, CheckCircle2, XCircle } from "lucide-react";

const Results = () => {
  const navigate = useNavigate();
  
  // Mock data - in production, fetch from backend
  const results = {
    score: 120,
    totalQuestions: 25,
    solved: 8,
    timeTaken: "28:45",
    language: "Python",
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl p-8 space-y-8 cyber-glow">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Trophy className="h-24 w-24 text-secondary animate-pulse-glow" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Contest Complete!
          </h1>
          <p className="text-muted-foreground text-lg">Your debugging marathon results</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-6 rounded-lg bg-primary/10 border border-primary">
            <div className="text-5xl font-bold text-primary mb-2">{results.score}</div>
            <div className="text-sm text-muted-foreground">Total Score</div>
          </div>

          <div className="text-center p-6 rounded-lg bg-secondary/10 border border-secondary">
            <div className="text-5xl font-bold text-secondary mb-2">{results.solved}</div>
            <div className="text-sm text-muted-foreground">Questions Solved</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <Code2 className="h-5 w-5 text-primary" />
              <span className="text-foreground">Language</span>
            </div>
            <span className="font-semibold text-foreground">{results.language}</span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-foreground">Time Taken</span>
            </div>
            <span className="font-semibold text-foreground">{results.timeTaken}</span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-foreground">Correct</span>
            </div>
            <span className="font-semibold text-green-500">{results.solved}</span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-foreground">Unsolved</span>
            </div>
            <span className="font-semibold text-destructive">
              {results.totalQuestions - results.solved}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/language-selection")}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6"
          >
            Try Another Language
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full py-6"
          >
            Back to Home
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>⚠️ Leaderboard is only visible to administrators</p>
        </div>
      </Card>
    </div>
  );
};

export default Results;
