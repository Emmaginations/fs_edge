// supabase/functions/scrape-results/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // or your domain like "https://yourapp.com"
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SB_SERVICE_ROLE_KEY")!
  )
  
  try {
    const { url, event_name } = await req.json()

    if (!url) {
      return new Response(JSON.stringify({ error: "Missing url" }), { status: 400, headers: CORS_HEADERS })
    }

    // Fetch the IJS page
    const response = await fetch(url, {
      headers: { "User-Agent": "skating-results-bot/1.0" }
    })
    const html = await response.text()

    // Parse text from HTML
    const text = html.replace(/<[^>]*>/g, "\n") // strip tags
    const start = text.indexOf("Final Standings")
    const end = text.indexOf("Panel of Officials")

    if (start === -1) {
      return new Response(JSON.stringify({ error: "Standings not found" }), { status: 400, headers: CORS_HEADERS  })
    }

    const block = text.slice(start, end === -1 ? undefined : end)
    const lines = block
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)

    const entries = lines
      .filter(l => /^\d+\./.test(l))
      .map(line => {
        const placement = Number(line.match(/^(\d+)/)?.[1])
        const afterNumber = line.replace(/^\d+\.\s*/, "")
        const [name, university] = afterNumber.split(",")

        return {
          placement,
          name: name?.trim(),
          university: university?.trim() ?? null
        }
      })

    const groupSize = entries.length

    // Get event
    const { data: eventsData, error: eventErr } = await supabase
            .from("Event")
            .select("id, name")
            .eq("name", event_name)
            .limit(1);    

    const event = eventsData?.[0];

    // Get teams
    const { data: teamsData, error: teamErr } = await supabase
            .from("Team")
            .select("id, name");
    const teamMap = new Map();
    teamsData?.forEach((t) => {
    teamMap.set(t.name, {
        teamId: t.id,
        name: t.name,
    });
    });

    const { data: skatersData, error: skaterErr } = await supabase
            .from('Skater')
            .select("id, name");
    const skaterMap = new Map();
    skatersData?.forEach((s) => {
    skaterMap.set(s.name, {
        skaterId: s.id,
        name: s.name,
    });
    });

    // Process each skater
    for (const entry of entries) {
      if (!entry.name) continue
      if (teamMap.get(entry.university) == null) continue;

      const { data: pointRec, error: pErr } = await supabase
        .from("Point") // 🔴 Replace if needed (table that maps placement+group_size -> points)
        .select("points")
        .eq("placement", Number(entry.placement))
        .eq("group_size", Number(groupSize))
        .single();
  
      // Insert result
      await supabase.from("Result").insert({
        event_id: event?.name,
        skater_id: skaterMap.get(entry.name)?.skaterId,
        placement: entry.placement,
        group_size: groupSize,
        points: pointRec?.points
      })
    }

    return new Response(JSON.stringify({
      success: true,
      groupSize,
      entries
    }), { status: 200, headers: CORS_HEADERS})

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), { status: 500, headers: CORS_HEADERS })
  }
})
