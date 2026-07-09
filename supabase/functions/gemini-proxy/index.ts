import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch Gemini API key from hb_secrets
    const { data: secretData, error: secretError } = await supabase
      .from("hb_secrets")
      .select("key_value")
      .eq("key_name", "gemini_api_key")
      .single();

    if (secretError || !secretData?.key_value) {
      throw new Error(`Gemini API key not found: ${secretError?.message || "check hb_secrets table"}`);
    }

    const apiKeyString = secretData.key_value || "";
    // Allow comma-separated multiple keys for rotation/load balancing
    const keys = apiKeyString.split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      throw new Error("No Gemini API keys found in hb_secrets.");
    }

    const { action, payload } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map to user-specified models or default models based on action
    let targetModel = payload?.model;
    if (!targetModel) {
      if (action === "chat") {
        targetModel = "gemma-4-31b";
      } else if (action === "live_scan" || action === "analyze_live_frame") {
        targetModel = "gemini-3-flash-live";
      } else {
        targetModel = "gemini-3.1-flash-lite";
      }
    }

    let geminiPayload: Record<string, unknown> = {};

    if (action === "analyze_text" || action === "generate_diet") {
      const temp = action === "generate_diet" ? 0.7 : 0.2;
      geminiPayload = {
        contents: [{ role: "user", parts: [{ text: payload.prompt }] }],
        generationConfig: { temperature: temp, topP: 0.9, maxOutputTokens: 1024 }
      };

    } else if (action === "analyze_image") {
      geminiPayload = {
        contents: [{
          role: "user",
          parts: [
            { text: payload.prompt },
            {
              inlineData: {
                mimeType: payload.mimeType || "image/jpeg",
                data: payload.data
              }
            }
          ]
        }],
        generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 2048 }
      };

    } else if (action === "chat") {
      geminiPayload = {
        contents: payload.contents,
        generationConfig: { temperature: 0.8, topP: 0.95, maxOutputTokens: 1024 }
      };

    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let responseData: any = null;
    let success = false;
    let lastErrorMsg = "";

    // We try all keys, and for each key we try the latest model and its fallbacks
    for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
      const currentKey = keys[keyIdx];
      
      let modelsToTry = [targetModel];
      if (targetModel === "gemini-3.1-flash-lite") {
        modelsToTry = ["gemini-3.1-flash-lite", "gemini-1.5-flash-8b"];
      } else if (targetModel === "gemini-3-flash-live") {
        modelsToTry = ["gemini-3-flash-live", "gemini-1.5-flash"];
      } else if (targetModel === "gemma-4-31b") {
        modelsToTry = ["gemma-4-31b", "gemma-4-31b-it", "gemma-2-27b-it"];
      }

      for (const apiModel of modelsToTry) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${currentKey}`;

        try {
          console.log(`[Key ${keyIdx + 1}] Invoking model: ${apiModel}`);
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiPayload)
          });

          responseData = await res.json();

          if (res.ok) {
            success = true;
            responseData.modelVersion = apiModel;
            console.log(`[Success] Successfully resolved using model: ${apiModel}`);
            break;
          } else {
            const code = responseData?.error?.code || res.status;
            const message = responseData?.error?.message || res.statusText;
            console.warn(`[Failed] key index: ${keyIdx}, model: ${apiModel}, status: ${code}, message: ${message}`);
            lastErrorMsg = `Model ${apiModel} (HTTP ${code}): ${message}`;
          }
        } catch (err: any) {
          console.error(`[Exception] key index: ${keyIdx}, model: ${apiModel}, error: ${err.message}`);
          lastErrorMsg = err.message;
        }
      }
      
      if (success) break;
    }

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "ALL_ATTEMPTS_FAILED",
          message: `Failed to contact any Gemini models. Last error: ${lastErrorMsg}`
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[gemini-proxy] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
