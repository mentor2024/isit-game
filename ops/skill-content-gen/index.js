const Exa = require("exa-js");
require("dotenv").config();

// Initialize Exa client
// Use the key from environment or config
const exa = new Exa(process.env.EXA_API_KEY);

module.exports = {
    /**
     * Searches the web using Exa's neural search engine.
     * @param {string} query - The search query.
     * @param {object} options - Optional parameters (numResults, useAutoprompt).
     * @returns {Promise<object>} - The search results with content.
     */
    async search_web(query, options = {}) {
        console.log(`[Exa] Searching for: "${query}"`);

        try {
            const result = await exa.searchAndContents(query, {
                type: "auto",
                useAutoprompt: true,
                numResults: options.numResults || 3,
                text: true, // Get full text content
                highlights: false
            });

            return result;
        } catch (error) {
            console.error("[Exa] Search failed:", error);
            throw error;
        }
    },

    // OpenClaw likely calls an 'activate' or 'register' function.
    // This is a placeholder for standard module exports.
    activate: async (context) => {
        // If context has a tool registry
        if (context && context.registerTool) {
            context.registerTool({
                name: "search_web",
                description: "Search the web for current information using Exa.",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The topic or question to research."
                        },
                        numResults: {
                            type: "integer",
                            description: "Number of results to return (default: 3).",
                            default: 3
                        }
                    },
                    required: ["query"]
                },
                handler: async ({ query, numResults }) => {
                    return await module.exports.search_web(query, { numResults });
                }
            });
            console.log("[Exa] 'search_web' tool registered.");
        }
    }
};
