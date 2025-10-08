import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Code2, Trophy, Clock, Users, ArrowRight, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import eventPoster from "@/assets/event-poster.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background/80" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center space-y-12">
          <div className="space-y-6">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Code2 className="h-20 w-20 text-primary animate-pulse-glow" />
                <Sparkles className="h-8 w-8 text-secondary absolute -top-2 -right-2 animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-7xl font-bold leading-tight">
              <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                CODE ALCHEMISTS
              </span>
            </h1>
            
            <p className="text-3xl text-secondary italic font-semibold">
              Turning Bugs into Brilliance
            </p>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join the ultimate 30-minute debugging marathon. Test your skills, fix the bugs, 
              and compete for glory!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate("/login")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold cyber-glow"
            >
              Start Contest
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-12">
            <Card className="p-6 space-y-3 bg-card/50 backdrop-blur border-primary/20">
              <Clock className="h-10 w-10 text-primary mx-auto" />
              <h3 className="text-xl font-bold text-foreground">30 Minutes</h3>
              <p className="text-sm text-muted-foreground">Intense debugging challenge</p>
            </Card>

            <Card className="p-6 space-y-3 bg-card/50 backdrop-blur border-secondary/20">
              <Code2 className="h-10 w-10 text-secondary mx-auto" />
              <h3 className="text-xl font-bold text-foreground">3 Languages</h3>
              <p className="text-sm text-muted-foreground">Python, C, or Java</p>
            </Card>

            <Card className="p-6 space-y-3 bg-card/50 backdrop-blur border-accent/20">
              <Trophy className="h-10 w-10 text-accent mx-auto" />
              <h3 className="text-xl font-bold text-foreground">200 Points</h3>
              <p className="text-sm text-muted-foreground">Maximum possible score</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Event Info Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-foreground">
                About the Event
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Code Alchemists is a competitive debugging marathon where participants 
                race against time to fix 25 carefully crafted buggy code challenges. 
                Choose your language, start the timer, and prove your debugging mastery.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Individual or Duo</h4>
                    <p className="text-sm text-muted-foreground">
                      Participate solo or team up with a partner
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Prize Pool: ₹1000+</h4>
                    <p className="text-sm text-muted-foreground">
                      Compete for exciting rewards and recognition
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate("/login")}
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
              >
                Register for FREE
              </Button>
            </div>

            <div className="relative">
              <img
                src={eventPoster}
                alt="Code Alchemists Event Poster"
                className="rounded-lg shadow-2xl cyber-glow"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contest Structure */}
      <section className="py-20 px-6 bg-card/30">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-foreground">Contest Structure</h2>
            <p className="text-lg text-muted-foreground">
              Each language features 25 debugging challenges
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4 border-2 border-green-500/30">
              <div className="text-center">
                <div className="inline-block px-4 py-2 rounded-full bg-green-500/20 text-green-400 font-bold text-lg mb-3">
                  EASY
                </div>
                <div className="text-5xl font-bold text-green-400">5</div>
                <div className="text-sm text-muted-foreground mt-2">Questions</div>
              </div>
              <div className="pt-4 border-t border-border text-center">
                <div className="text-2xl font-bold text-foreground">10 pts</div>
                <div className="text-xs text-muted-foreground">per question</div>
              </div>
            </Card>

            <Card className="p-6 space-y-4 border-2 border-yellow-500/30">
              <div className="text-center">
                <div className="inline-block px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-lg mb-3">
                  MEDIUM
                </div>
                <div className="text-5xl font-bold text-yellow-400">3</div>
                <div className="text-sm text-muted-foreground mt-2">Questions</div>
              </div>
              <div className="pt-4 border-t border-border text-center">
                <div className="text-2xl font-bold text-foreground">20 pts</div>
                <div className="text-xs text-muted-foreground">per question</div>
              </div>
            </Card>

            <Card className="p-6 space-y-4 border-2 border-red-500/30">
              <div className="text-center">
                <div className="inline-block px-4 py-2 rounded-full bg-red-500/20 text-red-400 font-bold text-lg mb-3">
                  HARD
                </div>
                <div className="text-5xl font-bold text-red-400">3</div>
                <div className="text-sm text-muted-foreground mt-2">Questions</div>
              </div>
              <div className="pt-4 border-t border-border text-center">
                <div className="text-2xl font-bold text-foreground">30 pts</div>
                <div className="text-xs text-muted-foreground">per question</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="flex justify-center gap-8 text-sm text-muted-foreground">
            <span>GDG On Campus</span>
            <span>•</span>
            <span>Vishwaniketan's iMEET</span>
            <span>•</span>
            <span>ARALIS</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 Code Alchemists. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
