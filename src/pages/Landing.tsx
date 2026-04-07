import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { MessageSquare, Zap, Globe, Shield, Moon, Sun, ArrowRight, Bot } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  const features = [
    { icon: Globe, title: "Auto Language Detection", desc: "Your bot detects and responds in the user's language automatically." },
    { icon: Zap, title: "Instant Setup", desc: "Configure your chatbot in minutes and embed it on any website." },
    { icon: MessageSquare, title: "Smart Responses", desc: "AI-powered answers based on your FAQ and product knowledge." },
    { icon: Shield, title: "Secure & Reliable", desc: "Enterprise-grade security with 99.9% uptime guarantee." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold gradient-text">LinguaBot</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-muted transition-colors">
              {dark ? <Sun className="h-5 w-5 text-muted-foreground" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
            </button>
            <Button onClick={() => navigate("/auth")} variant="outline" size="sm">Sign In</Button>
            <Button onClick={() => navigate("/auth")} size="sm" className="gradient-primary border-0 text-primary-foreground">Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Zap className="h-4 w-4" /> AI-Powered Multilingual Chatbot
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Build Your <span className="gradient-text">Intelligent Chatbot</span> in Minutes
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Create a multilingual AI chatbot that understands your business. No coding required — just configure, embed, and let AI handle the rest.
          </p>
          <div className="flex items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button onClick={() => navigate("/auth")} size="lg" className="gradient-primary border-0 text-primary-foreground px-8">
              Start Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Why <span className="gradient-text">LinguaBot</span>?</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className="glass rounded-xl p-6 hover:shadow-lg transition-all duration-300 group animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-muted-foreground text-sm">
          © 2026 LinguaBot. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
