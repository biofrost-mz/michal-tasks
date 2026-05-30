import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kdzztkclpfgnjjqovkns.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkenp0a2NscGZnbmpqcW92a25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjYxOTksImV4cCI6MjA4ODMwMjE5OX0.pZE6Zv9qsxvZugl8uH3Q8bqB23NRk_eCqu2FlCi150U";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Testing project insert with color...");
  try {
    const { data, error } = await supabase.from("projects").insert({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Test Project Color",
      color: "#ff0000"
    });
    console.log("Insert result:", { data, error });
  } catch (e) {
    console.error("Insert exception:", e);
  }
}

check();
