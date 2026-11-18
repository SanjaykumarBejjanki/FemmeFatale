import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://rniphqzeepdkwjwsgxxu.supabase.co";

const supabaseAnonKey =
  "sb_publishable_WckzLUasTXcj_ZLcPOy86g_242cofze";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);