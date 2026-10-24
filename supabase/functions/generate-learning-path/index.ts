import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { interests, goals, enrolledCourses } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are an expert learning path advisor for Genlink Hub, a premium educational platform focused on spiritual wealth, financial literacy, ICT skills, and online income generation.

Analyze the user's interests, goals, and current progress to recommend a personalized learning path.

Available courses:
1. Mindset Renewal & Spiritual Wealth Mastery (Free, 6 weeks) - Category: spiritual
2. Foundations of Financial Wisdom and Wealth Building (Free + Premium, 8 weeks) - Category: financial
3. Digital Fluency & Tech Mindset Development (Free, 6 weeks) - Category: ict
4. Forex Trading Fundamentals and Strategy (Free + Premium, 10 weeks) - Category: financial
5. Content Creation, Online Writing & eBook Entrepreneurship (Free + Premium, 10 weeks) - Category: income
6. YouTube Monetization & Automation Masterclass (Free + Premium, 8 weeks) - Category: income
7. Cybersecurity Essentials (Free, 6 weeks) - Category: ict
8. Introduction to Cloud Computing (Free, 6 weeks) - Category: ict
9. Advanced Python Programming (Premium, 8 weeks) - Category: ict
10. Data Science & Analytics Foundations (Premium, 10 weeks) - Category: ict
11. IoT for Beginners (Free, 6 weeks) - Category: ict
12. AI & Machine Learning Basics (Premium, 10 weeks) - Category: ict

Provide a structured learning path with 3-5 recommended courses in priority order, explaining why each course fits their goals.`;

    const userPrompt = `User Profile:
- Interests: ${interests?.join(", ") || "Not specified"}
- Goals: ${goals || "Not specified"}
- Already enrolled in: ${enrolledCourses?.join(", ") || "None"}

Generate a personalized learning path recommendation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const recommendation = data.choices[0].message.content;

    // Store the learning path
    await supabaseClient.from("learning_paths").insert({
      user_id: user.id,
      recommended_courses: { recommendation },
      reasoning: recommendation,
    });

    return new Response(JSON.stringify({ recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});