import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timer } from "@/components/Timer";
import { CodeEditor } from "@/components/CodeEditor";
import { CheckCircle2, Circle, Code2, Send, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: number;
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
    setCode(questions[0].faultyCode);
  }, [navigate]);

  const handleQuestionChange = (index: number) => {
    setCurrentQuestion(index);
    setCode(questions[index].faultyCode);
    setShowHint(false);
  };

  const handleSubmit = () => {
    // Mock evaluation - in production, send to backend
    const isCorrect = Math.random() > 0.5; // Simulate 50% success rate
    
    if (isCorrect) {
      const updatedQuestions = [...questions];
      if (!updatedQuestions[currentQuestion].solved) {
        updatedQuestions[currentQuestion].solved = true;
        setQuestions(updatedQuestions);
        setScore(score + updatedQuestions[currentQuestion].points);
        toast.success(`Correct! +${updatedQuestions[currentQuestion].points} points`, {
          description: "Bug fixed successfully!",
        });
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
            <Timer initialMinutes={30} onTimeUp={handleTimeUp} />
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
                  <Button variant="outline" onClick={() => setShowHint(true)}>
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
            >
              <Send className="mr-2 h-5 w-5" />
              Submit Solution
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contest;
