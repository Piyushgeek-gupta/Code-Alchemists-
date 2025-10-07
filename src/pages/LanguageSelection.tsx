import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, ArrowRight } from "lucide-react";
import pythonIcon from "@/assets/python-icon.png";
import cIcon from "@/assets/c-icon.png";
import javaIcon from "@/assets/java-icon.png";
import { toast } from "sonner";

const LanguageSelection = () => {
  const navigate = useNavigate();

  const languages = [
    {
      name: "Python",
      icon: pythonIcon,
      description: "High-level, interpreted language",
      color: "from-blue-500 to-yellow-500",
    },
    {
      name: "C",
      icon: cIcon,
      description: "Low-level, procedural language",
      color: "from-cyan-500 to-yellow-500",
    },
    {
      name: "Java",
      icon: javaIcon,
      description: "Object-oriented, platform-independent",
      color: "from-orange-500 to-cyan-500",
    },
  ];

  const handleSelect = (language: string) => {
    toast.success(`${language} selected! Timer starting...`);
    localStorage.setItem("selectedLanguage", language);
    setTimeout(() => {
      navigate("/contest");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Code2 className="h-12 w-12 text-primary animate-pulse-glow" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Choose Your Weapon
          </h1>
          <p className="text-muted-foreground text-lg">
            Select a programming language to begin the debugging marathon
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border">
            <span className="text-sm text-muted-foreground">⚠️ Cannot be changed after selection</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {languages.map((lang) => (
            <Card
              key={lang.name}
              className="group p-8 space-y-6 hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-primary cyber-glow"
              onClick={() => handleSelect(lang.name)}
            >
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={lang.icon}
                    alt={lang.name}
                    className="h-32 w-32 object-contain group-hover:scale-110 transition-transform"
                  />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-foreground">{lang.name}</h3>
                <p className="text-sm text-muted-foreground">{lang.description}</p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Easy (12)</span>
                  <span className="text-primary">10 pts each</span>
                </div>
                <div className="flex justify-between">
                  <span>Medium (8)</span>
                  <span className="text-secondary">20 pts each</span>
                </div>
                <div className="flex justify-between">
                  <span>Hard (5)</span>
                  <span className="text-destructive">30 pts each</span>
                </div>
              </div>

              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group-hover:gap-4 transition-all">
                Select {lang.name}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Total: 25 questions • Time limit: 30 minutes • Max score: 430 points</p>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;
