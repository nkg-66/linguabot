import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, ChatbotConfig } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, LogOut, Moon, Sun, Loader2, RotateCcw, Eye, Shield } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Admin = () => {
  const { user, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<ChatbotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ChatbotConfig | null>(null);

  useEffect(() => {
    if (user?.email !== "admin@linguabot.com") {
      navigate("/");
      return;
    }
    fetchAll();
  }, [user, navigate]);

  const fetchAll = async () => {
    const { data, error } = await supabase.from("chatbot_configs").select("*");
    if (error) toast.error(error.message);
    else setConfigs((data as ChatbotConfig[]) || []);
    setLoading(false);
  };

  const changePlan = async (id: string, plan: string) => {
    const limit = plan === "pro" ? 5000 : 100;
    const { error } = await supabase.from("chatbot_configs").update({ plan, messages_limit: limit }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Plan updated to ${plan}`); fetchAll(); }
  };

  const resetUsage = async (id: string) => {
    const { error } = await supabase.from("chatbot_configs").update({ messages_used: 0 }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Usage reset"); fetchAll(); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b glass sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-destructive" />
            <span className="text-lg font-bold">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-muted transition-colors">
              {dark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            </button>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">All Chatbot Configurations ({configs.length})</h1>
        <div className="space-y-4">
          {configs.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" /> {c.brand_name}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{c.plan}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{c.bot_name} — {c.messages_used}/{c.messages_limit} msgs</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={c.plan} onValueChange={(v) => changePlan(c.id, v)}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => resetUsage(c.id)}><RotateCcw className="h-3 w-3 mr-1" /> Reset</Button>
                  <Button variant="outline" size="sm" onClick={() => setDetail(c)}><Eye className="h-3 w-3 mr-1" /> View</Button>
                </div>
              </div>
            </Card>
          ))}
          {configs.length === 0 && <p className="text-muted-foreground text-center py-12">No chatbots found.</p>}
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.brand_name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              {Object.entries({
                "Bot Name": detail.bot_name,
                "Website": detail.website_url,
                "Tone": detail.bot_tone,
                "Plan": detail.plan,
                "Messages": `${detail.messages_used} / ${detail.messages_limit}`,
                "Greeting": detail.greeting_message,
                "Embed Key": detail.embed_key,
                "Created": new Date(detail.created_at).toLocaleDateString(),
              }).map(([k, v]) => (
                <div key={k} className="flex gap-2"><span className="text-muted-foreground w-24 shrink-0">{k}:</span><span className="font-medium break-all">{v}</span></div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
