const { SX } = require('@supabase/supabase-js');

let supabase = null;

module.exports = {
    activate: async (context) => {
        // Inject Supabase client on activation
        if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
            const { createClient } = require('@supabase/supabase-js');
            supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
            console.log("[Support] Supabase CRM connected.");
        } else {
            console.warn("[CRM] Missing SUPABASE_URL or SUPABASE_KEY env vars. CRM skill disabled.");
            return;
        }

        if (context && context.registerTool) {
            // Tool 1: Create or Update Lead
            context.registerTool({
                name: "upsert_lead",
                description: "Create or update a lead (person/entity) in the CRM.",
                parameters: {
                    type: "object",
                    properties: {
                        email: { type: "string", description: "Email address of the lead" },
                        name: { type: "string", description: "Name of the person/entity" },
                        source: { type: "string", description: "Where lead came from (e.g. chat, twitter)" },
                        status: { type: "string", description: "Status (new, contacted, customer)" },
                        metadata: { type: "object", description: "Arbitrary JSON data about the lead" }
                    },
                    required: ["email"]
                },
                handler: async ({ email, name, source, status, metadata }) => {
                    if (!supabase) return "Error: Database not connected.";

                    const updates = { email, updated_at: new Date() };
                    if (name) updates.name = name;
                    if (source) updates.source = source;
                    if (status) updates.status = status;
                    if (metadata) updates.metadata = metadata;

                    const { data, error } = await supabase
                        .from('leads')
                        .upsert(updates, { onConflict: 'email' })
                        .select()
                        .single();

                    if (error) {
                        console.error("[CRM] upsert_lead error:", error);
                        return `Error saving lead: ${error.message}`;
                    }
                    return `Lead saved: ${data.name || data.email} (ID: ${data.id})`;
                }
            });

            // Tool 2: Get Lead Info
            context.registerTool({
                name: "get_lead",
                description: "Retrieve information about a lead by email.",
                parameters: {
                    type: "object",
                    properties: {
                        email: { type: "string" }
                    },
                    required: ["email"]
                },
                handler: async ({ email }) => {
                    if (!supabase) return "Error: Database not connected.";

                    const { data, error } = await supabase
                        .from('leads')
                        .select('*, memories(*)') // Join memories
                        .eq('email', email)
                        .single();

                    if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
                        console.error("[CRM] get_lead error:", error);
                        return `Error finding lead: ${error.message}`;
                    }

                    if (!data) return "Lead not found in CRM.";

                    // Format for the agent
                    let summary = `Lead: ${data.name || 'Unknown'} (${data.email})\nStatus: ${data.status}\n`;
                    if (data.memories && data.memories.length > 0) {
                        summary += `Recent Interactions:\n`;
                        data.memories.slice(0, 5).forEach(m => {
                            summary += `- [${new Date(m.created_at).toLocaleDateString()}] (${m.type}): ${m.content}\n`;
                        });
                    }
                    return summary;
                }
            });

            // Tool 3: Log Interaction (Memory)
            context.registerTool({
                name: "log_interaction",
                description: "Log a memory or interaction with a lead.",
                parameters: {
                    type: "object",
                    properties: {
                        email: { type: "string", description: "Email of the lead" },
                        type: { type: "string", description: "Type of interaction (chat, email, search_result)" },
                        content: { type: "string", description: "Summary of what happened or was learned" }
                    },
                    required: ["email", "content", "type"]
                },
                handler: async ({ email, type, content }) => {
                    if (!supabase) return "Error: Database not connected.";

                    // First get lead ID
                    const { data: lead, error: leadError } = await supabase
                        .from('leads')
                        .select('id')
                        .eq('email', email)
                        .single();

                    if (!lead) return "Error: Lead not found. Create lead first.";

                    const { error } = await supabase
                        .from('memories')
                        .insert({
                            lead_id: lead.id,
                            type,
                            content
                        });

                    if (error) return `Error logging memory: ${error.message}`;
                    return "Interaction logged successfully.";
                }
            });

            console.log("[CRM] Tools registered: upsert_lead, get_lead, log_interaction");
        }
    }
};
