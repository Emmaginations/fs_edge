// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aldagkjzonrziqgocjac.supabase.co";
const supabaseAnonKey = "sb_publishable_-HovkCguearRuAnC-k7sPg_k71uJoh1";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);