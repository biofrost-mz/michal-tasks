import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kdzztkclpfgnjjqovkns.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkenp0a2NscGZnbmpqcW92a25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjYxOTksImV4cCI6MjA4ODMwMjE5OX0.pZE6Zv9qsxvZugl8uH3Q8bqB23NRk_eCqu2FlCi150U";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking columns...");
  
  try {
    const { data: tData, error: tErr } = await supabase.from("tasks").select("*").limit(1);
    if (tErr) console.error("tasks error:", tErr);
    else console.log("tasks sample row keys:", Object.keys(tData[0] || {}));
    
    const { data: pData, error: pErr } = await supabase.from("projects").select("*").limit(1);
    if (pErr) console.error("projects error:", pErr);
    else console.log("projects sample row keys:", Object.keys(pData[0] || {}));

    const { data: nData, error: nErr } = await supabase.from("notes").select("*").limit(1);
    if (nErr) console.error("notes error:", nErr);
    else console.log("notes sample row keys:", Object.keys(nData[0] || {}));
  } catch (err) {
    console.error("General error:", err);
  }
}

check();
