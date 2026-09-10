import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Simple query to keep database active
    await supabase
      .from("espn_weekly_data")
      .select("id")
      .limit(1);

    return Response.json({
      ok: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Keep-alive ping failed:", error);
    return Response.json(
      { error: "Database ping failed" },
      { status: 500 }
    );
  }
}
