import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface TimerProps {
  initialMinutes: number;
  onTimeUp?: () => void;
}

export const Timer = ({ initialMinutes, onTimeUp }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp?.();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 300; // Last 5 minutes

  return (
    <div
      className={`flex items-center gap-3 px-6 py-3 rounded-lg border transition-all ${
        isUrgent
          ? "border-destructive bg-destructive/10 animate-pulse-glow"
          : "border-border bg-card"
      }`}
    >
      <Clock className={`h-5 w-5 ${isUrgent ? "text-destructive" : "text-primary"}`} />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Time Remaining</span>
        <span
          className={`text-2xl font-bold font-mono ${
            isUrgent ? "text-destructive" : "text-foreground"
          }`}
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
};
