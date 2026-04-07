import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lttwuobnufpjvlirpndn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dHd1b2JudWZwanZsaXJwbmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTc5NzAsImV4cCI6MjA5MDc3Mzk3MH0.jzPjDvkH47QjBFXsRUSRaL98MuitCostqWeZcufdchE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type ChatbotConfig = {
  id: string;
  user_id: string;
  brand_name: string;
  website_url: string;
  faq_content: string;
  product_info: string;
  bot_name: string;
  greeting_message: string;
  bot_tone: string;
  primary_color: string;
  embed_key: string;
  plan: string;
  messages_used: number;
  messages_limit: number;
  created_at: string;
};
