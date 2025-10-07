import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Code2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    // Sign in via Supabase
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    // Determine userId. If email is unconfirmed, fall back to profiles/participants lookup by email.
    let userId: string | null = signInData?.user?.id ?? null;
    if (!userId && signInError && /confirm/i.test(signInError.message || "")) {
      const { data: profileByEmail } = await supabase
        .from("profiles")
        .select("user_id, email")
        .eq("email", email)
        .limit(1);
      userId = profileByEmail && profileByEmail.length > 0 ? profileByEmail[0].user_id : null;
    }

    if (!userId) {
      toast.error(signInError?.message || "Invalid credentials");
      return;
    }

    // Only allow users who were added as participants by admin
    const { data: participant, error: partErr } = await supabase
      .from("participants")
      .select("id, selected_language")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (partErr) {
      toast.error(partErr.message || "Failed to verify participant");
      return;
    }

    // Special admin redirect for test account
    if (email === "testtest@gmail.com" && password === "test1234") {
      toast.success("Admin login successful!");
      try { localStorage.setItem("login_email", email); } catch (e) {}
      navigate("/admin");
      return;
    }

    if (!participant) {
      toast.error("Access restricted. Your account is not registered as a participant.");
      if (signInData?.user) await supabase.auth.signOut();
      return;
    }

    toast.success("Login successful!");

    // Persist email for fallback flows (e.g., unconfirmed email without session)
    try { localStorage.setItem("login_email", email); } catch (e) {}

    // If participant already chose a language in DB, go to contest; otherwise force language-selection
    if (participant.selected_language) {
      try { localStorage.setItem("selectedLanguage", participant.selected_language as string); } catch (e) {}
      navigate("/contest");
    } else {
      try { localStorage.removeItem("selectedLanguage"); } catch (e) {}
      navigate("/language-selection");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />
      
      <Card className="w-full max-w-md p-8 space-y-6 relative z-10 cyber-glow">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Code2 className="h-16 w-16 text-primary animate-pulse-glow" />
              <Sparkles className="h-6 w-6 text-secondary absolute -top-2 -right-2" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            CODE ALCHEMISTS
          </h1>
          <p className="text-secondary italic text-lg">Turning Bugs into Brilliance</p>
          <p className="text-muted-foreground text-sm">30-Minute Debugging Marathon</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-input border-border focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-input border-border focus:border-primary"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg cyber-glow"
          >
            Enter Contest
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>GDG On Campus × ARALIS</p>
          <p>Vishwaniketan's iMEET</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
