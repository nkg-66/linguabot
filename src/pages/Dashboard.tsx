import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, ChatbotConfig } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { ChatModal } from "@/components/ChatModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot, LogOut, Moon, Sun, MessageSquare, Code, BarChart3, Sparkles, Copy, Check,
  Globe, Loader2, Settings
} from "lucide-react";
import { toast } from "sonner";



const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("chatbot_configs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        if (!data) navigate("/onboarding");
        else setConfig(data as ChatbotConfig);
        setLoading(false);
      });
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const embedCode = config
    ? `<script>\n  window.ChatbotKey = "${config.embed_key}";\n</script>\n<script src="https://linguabot.lovable.app/widget.js" async></script>`
    : "";

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) return null;

  const usagePercent = Math.round((config.messages_used / config.messages_limit) * 100);
  const usageColor = usagePercent > 90 ? "bg-destructive" : usagePercent > 70 ? "bg-yellow-500" : "bg-accent";
  const remaining = config.messages_limit - config.messages_used;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b glass sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold gradient-text">LinguaBot</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-muted transition-colors">
              {dark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            </button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Welcome back 👋</h1>
          <p className="text-muted-foreground text-sm">{config.brand_name} — {config.bot_name}</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview"><Settings className="h-4 w-4 mr-1.5" /> Overview</TabsTrigger>
            <TabsTrigger value="chatbot"><MessageSquare className="h-4 w-4 mr-1.5" /> My Chatbot</TabsTrigger>
            <TabsTrigger value="embed"><Code className="h-4 w-4 mr-1.5" /> Embed Code</TabsTrigger>
            <TabsTrigger value="usage"><BarChart3 className="h-4 w-4 mr-1.5" /> Usage</TabsTrigger>
            <TabsTrigger value="upgrade"><Sparkles className="h-4 w-4 mr-1.5" /> Upgrade</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid sm:grid-cols-3 gap-4">
              <Card className="p-5">
                <div className="text-sm text-muted-foreground mb-1">Plan</div>
                <div className="text-xl font-bold capitalize">{config.plan}</div>
              </Card>
              <Card className="p-5">
                <div className="text-sm text-muted-foreground mb-1">Messages Used</div>
                <div className="text-xl font-bold">{config.messages_used} / {config.messages_limit}</div>
              </Card>
              <Card className="p-5">
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <div className="text-xl font-bold text-accent">Active</div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="chatbot">
            <Card className="p-6">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Bot Name:</span> <span className="font-medium ml-2">{config.bot_name}</span></div>
                <div><span className="text-muted-foreground">Tone:</span> <span className="font-medium ml-2 capitalize">{config.bot_tone}</span></div>
                <div><span className="text-muted-foreground">Website:</span> <span className="font-medium ml-2">{config.website_url}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Color:</span>
                  <div className="h-5 w-5 rounded-full border" style={{ background: config.primary_color }} />
                  <span className="font-mono text-xs">{config.primary_color}</span>
                </div>
                <div className="sm:col-span-2"><span className="text-muted-foreground">Greeting:</span> <span className="font-medium ml-2">{config.greeting_message}</span></div>
              </div>
              <Button onClick={() => setShowChat(true)} className="mt-6 gradient-primary border-0 text-primary-foreground">
                <MessageSquare className="h-4 w-4 mr-2" /> Test Chatbot
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="embed">
            <Card className="p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2"><Globe className="h-4 w-4" /> Embed on your website</h3>
              <p className="text-sm text-muted-foreground mb-4">Copy and paste this code before the closing &lt;/body&gt; tag.</p>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto font-mono">{embedCode}</pre>
                <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={copyEmbed}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Message Usage</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">{config.messages_used} / {config.messages_limit}</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${usageColor}`} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
                </div>
                <p className="text-sm text-muted-foreground">{remaining > 0 ? `${remaining} messages remaining` : "Limit reached — upgrade your plan"}</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="upgrade">
            <div className="grid sm:grid-cols-2 gap-6">
              <Card className={`p-6 ${config.plan === "free" ? "border-primary" : ""}`}>
                <h3 className="font-bold text-lg">Free</h3>
                <div className="text-3xl font-extrabold my-3">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <ul className="text-sm space-y-2 text-muted-foreground mb-6">
                  <li>✓ 100 messages/month</li>
                  <li>✓ 1 chatbot</li>
                  <li>✓ Basic analytics</li>
                </ul>
                <Button variant="outline" disabled={config.plan === "free"} className="w-full">Current Plan</Button>
              </Card>
              <Card className={`p-6 ${config.plan === "pro" ? "border-primary" : "border-accent"}`}>
                <h3 className="font-bold text-lg">Pro</h3>
                <div className="text-3xl font-extrabold my-3">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <ul className="text-sm space-y-2 text-muted-foreground mb-6">
                  <li>✓ 5,000 messages/month</li>
                  <li>✓ Unlimited chatbots</li>
                  <li>✓ Priority support</li>
                </ul>
                <Button className="w-full gradient-primary border-0 text-primary-foreground" disabled={config.plan === "pro"}>
                  {config.plan === "pro" ? "Current Plan" : "Upgrade to Pro"}
                </Button>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showChat && <ChatModal config={config} onClose={() => setShowChat(false)} />}
    </div>
  );
};

export default Dashboard;
