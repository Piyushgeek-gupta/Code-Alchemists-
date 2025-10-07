import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface TimerProps {
  initialMinutes?: number;
  initialSeconds?: number;
  running?: boolean;
  onTimeUp?: () => void;
  onTick?: (secondsLeft: number) => void;
}

export const Timer = ({ initialMinutes, initialSeconds, running = true, onTimeUp, onTick }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(
    typeof initialSeconds === 'number' ? initialSeconds : (initialMinutes || 0) * 60
  );

  useEffect(() => {
    // reset when initialSeconds changes
    if (typeof initialSeconds === 'number') {
      setTimeLeft(initialSeconds);
    }
  }, [initialSeconds]);

  useEffect(() => {
    if (!running) return; // paused
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  // Notify parent on each tick based on timeLeft changes
  useEffect(() => {
    try { onTick?.(timeLeft); } catch {}
    if (timeLeft <= 0) {
      onTimeUp?.();
    }
  }, [timeLeft, onTick, onTimeUp]);

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
