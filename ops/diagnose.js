
const { createClient } = require('@supabase/supabase-js');

// Diagnostic Script for ISIT Promo Agent
console.log("--- ISIT Promo Agent Diagnostics ---");
console.log("Time:", new Date().toISOString());

const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

async function listGeminiModels() {
    console.log("\n--- Listing Gemini Models ---");
    if (!geminiKey) {
        console.error("❌ SKIPPED: Missing API Key");
        return;
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("❌ ERROR listing models:", JSON.stringify(data, null, 2));
            return;
        }

        console.log("Available Models:");
        if (data.models) {
            data.models.forEach(m => {
                if (m.name.includes("gemini") && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(` - ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log("No models found.");
        }
    } catch (err) {
        console.error("❌ ERROR calling Gemini ListModels:", err.message);
    }
}

async function run() {
    await listGeminiModels();
    console.log("\n--- Diagnostics Complete ---");
}

run();
