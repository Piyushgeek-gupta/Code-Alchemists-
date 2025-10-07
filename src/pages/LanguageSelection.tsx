import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, ArrowRight } from "lucide-react";
import pythonIcon from "@/assets/python-icon.png";
import cIcon from "@/assets/c-icon.png";
import javaIcon from "@/assets/java-icon.png";
import { toast } from "sonner";

const LanguageSelection = () => {
  const navigate = useNavigate();
  const [lockedLang, setLockedLang] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const [fetchedDbLang, setFetchedDbLang] = useState<string | null>(null);

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

  useEffect(() => {
    // If a user is signed-in, prefer the DB participant record for reset behavior.
    const init = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("participants")
            .select("selected_language")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error("Error fetching participant for language selection:", error);
            // fallback only for unauthenticated flows; skip localStorage for signed-in users
            return;
          }

          // If DB has a selected_language, lock to it. If DB value is null/absent, allow reselect.
          if (data && data.selected_language) {
            setFetchedDbLang(data.selected_language);
            setLockedLang(data.selected_language);
            try { localStorage.setItem("selectedLanguage", data.selected_language); } catch (e) {}
          } else {
            // admin may have reset; clear localStorage and allow selection
            try { localStorage.removeItem("selectedLanguage"); } catch (e) {}
            setLockedLang(null);
          }
          // continue
          return;
        } catch (err) {
          console.error("Unexpected error checking participant language:", err);
        }
      }

      // no signed-in user: fall back to client-only lock
      const existing = localStorage.getItem("selectedLanguage");
      if (existing) setLockedLang(existing);
    };

    // Only run after auth has loaded
    if (!loading) init();

    // Authenticated users should only consider DB selection for redirect
    if (!loading) {
      if (user) {
        if (fetchedDbLang) {
          try { localStorage.setItem("selectedLanguage", fetchedDbLang); } catch (e) {}
          navigate("/contest");
          return;
        }
      } else {
        const local = localStorage.getItem("selectedLanguage");
        const chosen = (lockedLang || local) as string | null;
        if (chosen) {
          try { localStorage.setItem("selectedLanguage", chosen); } catch (e) {}
          navigate("/contest");
          return;
        }
      }
    }
    // handle forceReset URL param (for testing or for admin-provided link)
    const params = new URLSearchParams(window.location.search);
    if (params.get("forceReset") === "1") {
      localStorage.removeItem("selectedLanguage");
      setLockedLang(null);
      toast.success("Language selection reset via URL param. You can choose again.");
    }
  }, [user, loading]);

  const handleSelect = async (language: string) => {
    // If user already selected once, prevent changing locally
    if (lockedLang) {
      toast.error("Language already selected. Contact admin to change.");
      return;
    }

    toast.success(`${language} selected! Timer starting...`);
    // Store lowercase language id to match DB enum values (python, c, java)
    const key = language.toLowerCase();
    localStorage.setItem("selectedLanguage", key);
    setLockedLang(key);

    // Persist selection
    try {
      if (user) {
        const { error } = await supabase
          .from("participants")
          .update({ selected_language: key as "python" | "c" | "java" })
          .eq("user_id", user.id)
          .is("selected_language", null);
        if (error) throw error;
      } else {
        const loginEmail = localStorage.getItem("login_email");
        if (loginEmail) {
          const endpoint = (import.meta.env.VITE_SERVER_URL || 'http://localhost:8787') + '/select-language';
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmail, language: key }),
          });
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body?.error || resp.statusText + ` (POST ${endpoint})`);
          }
        }
      }
    } catch (err) {
      console.error("Failed to persist selected language:", err);
      toast.error(`Failed to save language: ${err instanceof Error ? err.message : String(err)}`);
    }

    setTimeout(() => {
      navigate("/contest");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="absolute top-4 right-4 bg-card p-3 rounded shadow text-sm text-muted-foreground">
        <div>localStorage.selectedLanguage: <strong>{localStorage.getItem("selectedLanguage") ?? "(none)"}</strong></div>
        {user && <div>DB selected_language: <strong>{fetchedDbLang ?? "(none)"}</strong></div>}
        <div>lockedLang state: <strong>{lockedLang ?? "(none)"}</strong></div>
        <div className="text-xs text-muted-foreground mt-1">Tip: append <code>?forceReset=1</code> to this URL to clear client lock</div>
      </div>
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
              className={`group p-8 space-y-6 ${lockedLang ? "opacity-60 cursor-default" : "hover:scale-105 cursor-pointer"} transition-all duration-300 border-2 hover:border-primary cyber-glow`}
              onClick={() => !lockedLang && handleSelect(lang.name)}
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

              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group-hover:gap-4 transition-all" disabled={!!lockedLang}>
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
