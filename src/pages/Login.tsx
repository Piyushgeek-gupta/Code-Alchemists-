import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    // Mock authentication - replace with Lovable Cloud auth
    if (email && password.length >= 6) {
      toast.success("Login successful!");
      navigate("/language-selection");
    } else {
      toast.error("Invalid credentials");
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
