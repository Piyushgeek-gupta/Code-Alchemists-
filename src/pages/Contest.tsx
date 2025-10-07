import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timer } from "@/components/Timer";
import { CodeEditor } from "@/components/CodeEditor";
import { CheckCircle2, Circle, Code2, Send, Lightbulb, Clock } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: number; // UI index (1-based)
  dbId?: string; // Supabase questions.id when loaded from DB
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  description: string;
  hint: string;
  expectedInput: string;
  expectedOutput: string;
  faultyCode: string;
  solved: boolean;
}

const Contest = () => {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [code, setCode] = useState("");
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(30 * 60);
  const [contestActive, setContestActive] = useState<boolean>(false);
  const [contestDuration, setContestDuration] = useState<number>(30 * 60);
  const [contestStartTime, setContestStartTime] = useState<string | null>(null);
  const [contestPaused, setContestPaused] = useState<boolean>(false);
  const [globalTimeLeft, setGlobalTimeLeft] = useState<number>(0);
  const [contestLoading, setContestLoading] = useState<boolean>(true);

  // Sample questions (in production, load from backend)
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      title: "Missing Return Statement",
      difficulty: "Easy",
      points: 10,
      description:
        "The function should return the sum of two numbers, but it's not returning anything.",
      hint: "Check if the function has a return statement",
      expectedInput: "add(5, 3)",
      expectedOutput: "8",
      faultyCode: `def add(a, b):\n    result = a + b\n    # Missing return statement`,
      solved: false,
    },
    {
      id: 2,
      title: "Array Index Error",
      difficulty: "Medium",
      points: 20,
      description:
        "This function tries to access an array element that doesn't exist, causing an index out of bounds error.",
      hint: "Check the loop condition - is it going beyond the array length?",
      expectedInput: "get_last([1, 2, 3])",
      expectedOutput: "3",
      faultyCode: `def get_last(arr):\n    for i in range(len(arr) + 1):\n        if i == len(arr):\n            return arr[i]`,
      solved: false,
    },
    {
      id: 3,
      title: "Infinite Loop",
      difficulty: "Hard",
      points: 30,
      description:
        "This counter function should count from 0 to n, but it runs forever.",
      hint: "The loop variable is never being incremented",
      expectedInput: "count_to(5)",
      expectedOutput: "0 1 2 3 4 5",
      faultyCode: `def count_to(n):\n    i = 0\n    while i <= n:\n        print(i, end=' ')\n        # Missing increment`,
      solved: false,
    },
  ]);

  useEffect(() => {
    const lang = localStorage.getItem("selectedLanguage");
    if (!lang) {
      navigate("/language-selection");
      return;
    }
    setSelectedLanguage(lang);

    // Load contest state and questions from Supabase for the selected language
    const loadContestData = async () => {
      try {
        // Fetch contest status and duration
        const { data: contest } = await (await import("@/integrations/supabase/client")).supabase
          .from("contests")
          .select("status, duration_minutes, start_time")
          .in("status", ["active", "paused"]) // allow pause state
          .order("start_time", { ascending: false })
          .limit(1)
          .maybeSingle();
        const isActive = contest?.status === "active";
        setContestActive(Boolean(isActive));
        setContestPaused(contest?.status === 'paused');
        setContestStartTime(contest?.start_time || null);
        const durationSec = typeof contest?.duration_minutes === 'number' ? contest.duration_minutes * 60 : 30 * 60;
        setContestDuration(durationSec);
        // compute remaining time from server start_time
        if (contest?.start_time) {
          const startMs = new Date(contest.start_time).getTime();
          const nowMs = Date.now();
          const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
          const remaining = Math.max(0, durationSec - elapsed);
          setTimeLeftSeconds(remaining);
        } else {
          setTimeLeftSeconds(durationSec);
        }
        setGlobalTimeLeft(timeLeftSeconds);

        // cast to DB enum type to satisfy TypeScript
        const langKey = lang as "python" | "c" | "java";
        const { data } = await (await import("@/integrations/supabase/client")).supabase
          .from("questions")
          .select("id, title, difficulty, points, problem_statement, hint, test_cases, faulty_code, language, created_at")
          .eq("language", langKey)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          // Map DB rows to Question type expected by the UI
          const dbQuestions: Question[] = data.map((q: any, idx: number) => ({
            id: idx + 1,
            dbId: q.id,
            title: q.title || `Question ${idx + 1}`,
            difficulty: q.difficulty === "easy" ? "Easy" : q.difficulty === "medium" ? "Medium" : "Hard",
            points: q.points || 10,
            description: q.problem_statement || "",
            hint: q.hint || "",
            expectedInput: q.test_cases ? JSON.stringify(q.test_cases) : "",
            expectedOutput: "",
            faultyCode: q.faulty_code || "",
            solved: false,
          }));

          setQuestions(dbQuestions);
          setCode(dbQuestions[0].faultyCode);
          return;
        }
      } catch (err) {
        console.error(err);
      }

      // Fallback to built-in samples
      setCode(questions[0].faultyCode);
    };

    loadContestData().finally(() => {
      setContestLoading(false);
    });

    // Set up real-time subscription to contest status changes
    let subscription: any = null;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      subscription = supabase
        .channel('contest-status-changes')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'contests',
            filter: 'status=in.(active,paused,completed)'
          }, 
          (payload) => {
            console.log('Contest status changed:', payload);
            // Reload contest data when status changes
            loadContestData();
          }
        )
        .subscribe();
    })();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [navigate]);

  // Update global timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      // Only update timer if contest is active (not paused)
      if (contestActive && !contestPaused && contestStartTime && contestDuration) {
        const startMs = new Date(contestStartTime).getTime();
        const nowMs = Date.now();
        const elapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        const remaining = Math.max(0, contestDuration - elapsed);
        setGlobalTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [contestActive, contestPaused, contestStartTime, contestDuration]);

  const { user } = useAuth();
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Local persistence helpers (used when DB writes fail or DB state not available)
  const saveLocalProgress = (lang: string | null, scoreVal: number, solvedIds: number[]) => {
    try {
      const key = `progress_${lang || selectedLanguage || "unknown"}`;
      localStorage.setItem(key, JSON.stringify({ score: scoreVal, solved: solvedIds }));
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const resolveOrCreateParticipant = async () => {
      try {
        let resolvedUserId: string | null = user?.id ?? null;
        if (!resolvedUserId) {
          const email = localStorage.getItem("login_email");
          if (email) {
            const { data: prof, error: profErr } = await supabase
              .from("profiles")
              .select("user_id")
              .eq("email", email)
              .limit(1)
              .maybeSingle();
            if (!profErr && prof?.user_id) resolvedUserId = prof.user_id;
          }
        }

        if (!resolvedUserId) {
          // Fallback to local-only progress if we have no way to map a participant
          try {
            const langKey = selectedLanguage || (localStorage.getItem("selectedLanguage") || "");
            const raw = localStorage.getItem(`progress_${langKey}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.score) setScore(parsed.score);
              if (Array.isArray(parsed?.solved)) {
                const updated = [...questions];
                parsed.solved.forEach((qid: number) => {
                  const idx = updated.findIndex((q) => q.id === qid);
                  if (idx >= 0) updated[idx].solved = true;
                });
                setQuestions(updated);
              }
            }
          } catch {}
          return;
        }

        // Fetch participant by user_id
        const { data, error } = await supabase
          .from("participants")
          .select("id, score, selected_language")
          .eq("user_id", resolvedUserId)
          .limit(1)
          .maybeSingle();

        let participantRow = data ?? null;

        // Create if missing
        if (!participantRow) {
          const lang = (localStorage.getItem("selectedLanguage") || null) as "python" | "c" | "java" | null;
          const { data: insData } = await supabase
            .from("participants")
            .insert([{ contest_id: null, user_id: resolvedUserId, selected_language: lang, score: 0 }])
            .select("id, score, selected_language")
            .maybeSingle();
          participantRow = insData ?? null;
        }

        if (participantRow) {
          setParticipantId(participantRow.id);
          setScore(participantRow.score ?? 0);
          // Optional: sync local higher score
          try {
            const langKey = participantRow.selected_language ?? selectedLanguage ?? (localStorage.getItem("selectedLanguage") || "");
            const raw = localStorage.getItem(`progress_${langKey}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.score && (parsed.score > (participantRow.score ?? 0))) {
                await supabase.from("participants").update({ score: parsed.score }).eq("id", participantRow.id);
                setScore(parsed.score);
                try { localStorage.removeItem(`progress_${langKey}`); } catch {}
              } else {
                try { localStorage.removeItem(`progress_${langKey}`); } catch {}
              }
            }
          } catch {}
        }
      } catch (err) {
        console.error("Failed to resolve/create participant:", err);
      }
    };

    resolveOrCreateParticipant();
  }, [user]);

  const handleQuestionChange = (index: number) => {
    setCurrentQuestion(index);
    setCode(questions[index].faultyCode);
    setShowHint(false);
  };

  const handleSubmit = () => {
    // Mock evaluation - in production, send to backend
    const isCorrect = Math.random() > 0.5; // Simulate 50% success rate

    const currentPoints = questions[currentQuestion].points;

    if (isCorrect) {
      const updatedQuestions = [...questions];
      if (!updatedQuestions[currentQuestion].solved) {
        updatedQuestions[currentQuestion].solved = true;
        setQuestions(updatedQuestions);

        // Persist submission and update participant score if we have a participantId
        (async () => {
          try {
            // Ensure we have a participantId before submit; if not, try to resolve by email
            let pid = participantId;
            if (!pid) {
              try {
                const email = localStorage.getItem("login_email");
                if (email) {
                  const { data: prof } = await supabase.from("profiles").select("user_id").eq("email", email).limit(1).maybeSingle();
                  if (prof?.user_id) {
                    const { data: part } = await supabase
                      .from("participants")
                      .select("id")
                      .eq("user_id", prof.user_id)
                      .limit(1)
                      .maybeSingle();
                    if (part?.id) {
                      pid = part.id;
                      setParticipantId(pid);
                    }
                  }
                }
              } catch {}
            }

            if (pid) {
              const prevScore = score || 0;
              try {
                // Direct Supabase secure RPC call
                const { data, error } = await (supabase as any).rpc('secure_submit_and_log', {
                  p_question_id: questions[currentQuestion].dbId || null,
                  p_question_number: questions[currentQuestion].id,
                  p_submitted_code: code,
                  p_points_awarded: currentPoints,
                  p_time_left_seconds: timeLeftSeconds,
                  p_email: localStorage.getItem("login_email") || null,
                });
                if (error) {
                  toast.error(`Submit failed: ${error.message}`);
                } else {
                  const newScore = Array.isArray(data) ? data[0]?.new_score : data?.new_score;
                  const alreadySolved = Array.isArray(data) ? data[0]?.already_solved : data?.already_solved;
                  if (typeof newScore === 'number') {
                    setScore(newScore);
                    try { localStorage.removeItem(`progress_${selectedLanguage}`); } catch {}
                    if (alreadySolved) {
                      toast.info("Already solved!");
                    } else if (newScore > prevScore) {
                      toast.success(`Correct! +${currentPoints} points`, { description: "Bug fixed successfully!" });
                    } else {
                      toast.info("Already solved!");
                    }
                  } else {
                    toast.error('Unexpected submit response');
                  }
                }
              } catch (err: any) {
                console.error('Submit request failed', err);
                toast.error('Submit failed: server unavailable');
                // No RPC fallback to avoid CORS/401 and double-award risk
              }
            } else {
              // no participantId resolved: persist locally
              // Do not increment locally; just persist solved status
              saveLocalProgress(selectedLanguage, (score || 0), questions.filter(q => q.solved).map(q => q.id));
              toast.success(`Correct!`, { description: "Bug fixed successfully!" });
            }
          } catch (err) {
            console.error("Error persisting submission/score:", err);
            toast.error('Failed to persist submission');
          }
        })();
      } else {
        toast.info("Already solved!");
      }
    } else {
      toast.error("Incorrect solution", {
        description: "Try again or check the hint",
      });
    }
  };

  const handleTimeUp = () => {
    toast.error("Time's up!");
    navigate("/results");
  };

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Code Alchemists</h1>
              <p className="text-sm text-muted-foreground">{selectedLanguage} Marathon</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-card border border-border">
              <span className="text-sm text-muted-foreground">Score: </span>
              <span className="text-2xl font-bold text-primary">{score}</span>
            </div>
            {contestActive && globalTimeLeft > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                <Clock className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Contest Time</span>
                  <span className="text-lg font-bold font-mono">
                    {String(Math.floor(globalTimeLeft / 60)).padStart(2, "0")}:
                    {String(globalTimeLeft % 60).padStart(2, "0")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Question Navigator */}
        <Card className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {questions.map((q, index) => (
              <Button
                key={q.id}
                variant={currentQuestion === index ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuestionChange(index)}
                className="min-w-fit"
                disabled={contestPaused}
              >
                {q.solved ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 mr-2" />
                )}
                Q{q.id} ({q.points}pts)
              </Button>
            ))}
          </div>
        </Card>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Problem Statement */}
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">{question.title}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    question.difficulty === "Easy"
                      ? "bg-green-500/20 text-green-400"
                      : question.difficulty === "Medium"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {question.difficulty} • {question.points} pts
                </span>
              </div>
              <p className="text-muted-foreground">{question.description}</p>
            </div>

            <Tabs defaultValue="io" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="io">Input/Output</TabsTrigger>
                <TabsTrigger value="hint">Hint</TabsTrigger>
              </TabsList>
              <TabsContent value="io" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Expected Input:</h4>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono">
                    {question.expectedInput}
                  </pre>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Expected Output:</h4>
                  <pre className="bg-muted p-3 rounded-lg text-sm font-mono">
                    {question.expectedOutput}
                  </pre>
                </div>
              </TabsContent>
              <TabsContent value="hint" className="mt-4">
                {showHint ? (
                  <div className="bg-accent/20 border border-accent p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-5 w-5 text-secondary mt-0.5" />
                      <p className="text-sm text-foreground">{question.hint}</p>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowHint(true)}
                    disabled={contestPaused}
                  >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Show Hint
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Code Editor */}
          <div className="space-y-4">
            <Card className="p-4 h-[500px]">
              <CodeEditor language={selectedLanguage} value={code} onChange={(val) => setCode(val || "")} />
            </Card>
            <Button
              onClick={handleSubmit}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg font-semibold"
              disabled={contestPaused}
            >
              <Send className="mr-2 h-5 w-5" />
              {contestPaused ? 'Contest Paused' : 'Submit Solution'}
            </Button>
          </div>
        </div>
        {!contestLoading && (!contestActive || contestPaused) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="p-8 max-w-lg text-center space-y-4">
              <h2 className="text-2xl font-bold">
                {contestPaused ? 'Contest is Paused' : 'Contest has not started'}
              </h2>
              <p className="text-muted-foreground">
                {contestPaused 
                  ? 'The contest has been paused by the admin. Please wait for it to resume.' 
                  : 'Please wait for the admin to start the contest.'
                }
              </p>
              <Button onClick={() => navigate('/')} className="mt-2">Go Back</Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contest;

