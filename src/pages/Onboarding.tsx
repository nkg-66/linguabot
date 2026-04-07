import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, ArrowRight, ArrowLeft, Loader2, Smile, Briefcase, Coffee } from "lucide-react";
import { toast } from "sonner";

const tones = [
  { value: "friendly", label: "Friendly", icon: Smile, desc: "Warm, casual, and approachable" },
  { value: "professional", label: "Professional", icon: Briefcase, desc: "Formal, polished, and business-like" },
  { value: "casual", label: "Casual", icon: Coffee, desc: "Relaxed, fun, and conversational" },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brand_name: "",
    bot_name: "",
    website_url: "",
    primary_color: "#6c63ff",
    greeting_message: "",
    product_info: "",
    faq_content: "",
    bot_tone: "friendly",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const steps = [
    {
      title: "Tell us about your brand",
      fields: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="brand_name">Brand Name</Label>
            <Input id="brand_name" className="mt-1.5" value={form.brand_name} onChange={(e) => set("brand_name", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="bot_name">Bot Name</Label>
            <Input id="bot_name" className="mt-1.5" value={form.bot_name} onChange={(e) => set("bot_name", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="website_url">Website URL</Label>
            <Input id="website_url" className="mt-1.5" type="url" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} required />
          </div>
        </div>
      ),
    },
    {
      title: "Customize your bot",
      fields: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="primary_color">Bot Color</Label>
            <div className="flex items-center gap-3 mt-1.5">
              <input type="color" id="primary_color" value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-10 w-14 rounded-lg border-0 cursor-pointer" />
              <Input value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="flex-1 font-mono" />
            </div>
          </div>
          <div>
            <Label htmlFor="greeting">Greeting Message</Label>
            <Input id="greeting" className="mt-1.5" value={form.greeting_message} onChange={(e) => set("greeting_message", e.target.value)} required />
          </div>
          <div>
            <Label>Tone</Label>
            <div className="grid grid-cols-3 gap-3 mt-1.5">
              {tones.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set("bot_tone", t.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${form.bot_tone === t.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                >
                  <t.icon className={`h-6 w-6 mx-auto mb-2 ${form.bot_tone === t.value ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Add your knowledge base",
      fields: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="product_info">Product Information</Label>
            <Textarea id="product_info" className="mt-1.5 min-h-[120px]" value={form.product_info} onChange={(e) => set("product_info", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="faq_content">FAQ Content</Label>
            <Textarea id="faq_content" className="mt-1.5 min-h-[120px]" value={form.faq_content} onChange={(e) => set("faq_content", e.target.value)} required />
          </div>
        </div>
      ),
    },
  ];

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("chatbot_configs").insert({
        user_id: user.id,
        ...form,
        embed_key: crypto.randomUUID(),
        plan: "free",
        messages_used: 0,
        messages_limit: 100,
      });
      if (error) throw error;
      toast.success("Chatbot created!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create chatbot");
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.brand_name && form.bot_name && form.website_url;
    if (step === 1) return form.greeting_message && form.bot_tone;
    if (step === 2) return form.product_info && form.faq_content;
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Bot className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold">{steps[step].title}</h1>
          <div className="flex items-center justify-center gap-2 mt-4">
            {steps.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-8 bg-primary" : i < step ? "w-8 bg-accent" : "w-8 bg-muted"}`} />
            ))}
          </div>
        </div>
        <div className="glass rounded-xl p-6">
          {steps[step].fields}
          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <div className="flex-1" />
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gradient-primary border-0 text-primary-foreground">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading || !canNext()} className="gradient-primary border-0 text-primary-foreground">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Chatbot
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
