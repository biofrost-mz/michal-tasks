import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kdzztkclpfgnjjqovkns.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkenp0a2NscGZnbmpqcW92a25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjYxOTksImV4cCI6MjA4ODMwMjE5OX0.pZE6Zv9qsxvZugl8uH3Q8bqB23NRk_eCqu2FlCi150U";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking columns...");
  try {
    const { data: pData, error: pErr } = await supabase.from("projects").select("*").limit(1);
    if (pErr) console.error("Projects error:", pErr);
    else console.log("Projects record keys:", pData.length > 0 ? Object.keys(pData[0]) : "No records");

    const { data: tData, error: tErr } = await supabase.from("tasks").select("*").limit(1);
    if (tErr) console.error("Tasks error:", tErr);
    else console.log("Tasks record keys:", tData.length > 0 ? Object.keys(tData[0]) : "No records");

    const { data: nData, error: nErr } = await supabase.from("notes").select("*").limit(1);
    if (nErr) console.error("Notes error:", nErr);
    else console.log("Notes record keys:", nData.length > 0 ? Object.keys(nData[0]) : "No records");

  } catch (e) {
    console.error("Exception:", e);
  }
}

check();
