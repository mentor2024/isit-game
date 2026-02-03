
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves dynamic message variables like [[Q-S1-L1-P1]] (Question), [[A-S1-L1-P1]] (Answer), and [[P-S1-L1-P1]] (Points).
 * Also supports context-aware variables like [[RandomCorrectPick]] and [[RandomIncorrectPick]].
 * 
 * Format: [[Type-Stage-Level-Order]]
 * Type: Q = Question Title, A = User's Answer (selected object text), P = Points Earned
 * Stage: S# (e.g., S1)
 * Level: L# (e.g., L1)
 * Order: P# (e.g., P1 for Poll 1)
 */
export async function resolveDynamicMessageVariables(
    supabase: SupabaseClient,
    text: string,
    userId: string,
    context?: { stage: number, level: number }
): Promise<string> {
    if (!text || !userId) return text;

    let resolvedText = text;

    // --- 0. Context-Aware Random Variables ---
    if (context) {
        // Variables: [[RandomCorrectPoll]], [[RandomIncorrectPoll]], [[RandomCorrectPick]], [[RandomIncorrectPick]]
        const randomVars = [
            '[[RandomCorrectPoll]]', '[[RandomIncorrectPoll]]',
            '[[RandomCorrectPick]]', '[[RandomIncorrectPick]]'
        ];

        const neededVars = randomVars.filter(v => resolvedText.includes(v));

        if (neededVars.length > 0) {
            // Fetch all votes for this user in this stage/level
            // We need to join with polls to check stage/level
            const { data: votes } = await supabase
                .from('poll_votes')
                .select(`
                    id,
                    is_correct,
                    chosen_side,
                    selected_object_id,
                    points_earned,
                    poll:polls!inner(
                        id,
                        title,
                        stage,
                        level,
                        poll_objects(id, text, side)
                    )
                `)
                .eq('user_id', userId)
                .eq('poll.stage', context.stage)
                .eq('poll.level', context.level);

            if (votes && votes.length > 0) {
                // @ts-ignore
                const correctVotes = votes.filter(v => v.is_correct);
                // @ts-ignore
                const incorrectVotes = votes.filter(v => !v.is_correct);

                // Helper to pick random item
                const pickRandom = (arr: any[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

                // [[RandomCorrectPoll]] & [[RandomCorrectPick]]
                if (resolvedText.includes('[[RandomCorrectPoll]]') || resolvedText.includes('[[RandomCorrectPick]]')) {
                    const vote = pickRandom(correctVotes);
                    if (vote) {
                        // @ts-ignore
                        resolvedText = resolvedText.replace(/\[\[RandomCorrectPoll\]\]/g, vote.poll.title);
                        // @ts-ignore
                        const obj = vote.poll.poll_objects.find((o: any) => o.id === vote.selected_object_id);
                        resolvedText = resolvedText.replace(/\[\[RandomCorrectPick\]\]/g, obj ? obj.text : "Unknown Correct Pick");
                    } else {
                        resolvedText = resolvedText.replace(/\[\[RandomCorrectPoll\]\]/g, "a specific challenge");
                        resolvedText = resolvedText.replace(/\[\[RandomCorrectPick\]\]/g, "correct choice");
                    }
                }

                // [[RandomIncorrectPoll]] & [[RandomIncorrectPick]]
                if (resolvedText.includes('[[RandomIncorrectPoll]]') || resolvedText.includes('[[RandomIncorrectPick]]')) {
                    const vote = pickRandom(incorrectVotes);
                    if (vote) {
                        // @ts-ignore
                        resolvedText = resolvedText.replace(/\[\[RandomIncorrectPoll\]\]/g, vote.poll.title);

                        // For incorrect pick, find the object they selected (which was wrong)
                        // @ts-ignore
                        const obj = vote.poll.poll_objects.find((o: any) => o.id === vote.selected_object_id);
                        resolvedText = resolvedText.replace(/\[\[RandomIncorrectPick\]\]/g, obj ? obj.text : "Unknown Incorrect Pick");
                    } else {
                        // Fallback if they got everything right (no incorrect votes)
                        resolvedText = resolvedText.replace(/\[\[RandomIncorrectPoll\]\]/g, "a poll");
                        resolvedText = resolvedText.replace(/\[\[RandomIncorrectPick\]\]/g, "incorrect option");
                    }
                }
            }
        }
    }

    // 1. Find all placeholders - Added 'F' to the regex
    const regex = /\[\[([QAPF])-S(\d+)-L(\d+)-P(\d+)\]\]/g;
    const matches = [...resolvedText.matchAll(regex)];

    if (matches.length === 0) return resolvedText;

    // 2. Extract unique poll requirements (Stage, Level, Order)
    const requiredPolls = new Map<string, { stage: number, level: number, order: number, inputs: string[] }>();

    for (const match of matches) {
        const fullMatch = match[0]; // [[Q-S1-L1-P1]]
        const type = match[1] as 'Q' | 'A' | 'P' | 'F';
        const stage = parseInt(match[2]);
        const level = parseInt(match[3]);
        const order = parseInt(match[4]);

        const key = `S${stage}-L${level}-P${order}`;

        if (!requiredPolls.has(key)) {
            requiredPolls.set(key, { stage, level, order, inputs: [] });
        }
        requiredPolls.get(key)!.inputs.push(fullMatch);
    }

    // 3. Batch Query Logic (Simulated batching via Promise.all)
    const replacements = new Map<string, string>(); // "[[Q-S1...]]" -> "Is hotdog a sandwich?"

    const queries = Array.from(requiredPolls.values()).map(async ({ stage, level, order, inputs }) => {
        // A. Fetch Poll
        const { data: poll, error: pollError } = await supabase
            .from('polls')
            // Fetch instructions as this corresponds to the "Question" field in MC polls (Stage 0)
            // Fetch stage to determine which field to use
            // Added poll_objects(id, text, feedback) to fetch feedback
            // Added type and quad_feedback for Quad Sort support
            .select('id, title, instructions, stage, type, quad_feedback, poll_objects(id, text, feedback, image_url)')
            .eq('stage', stage)
            .eq('level', level)
            .eq('poll_order', order)
            .single();

        if (pollError || !poll) {
            console.warn(`Variable Resolution: Poll not found for S${stage}-L${level}-P${order}`, pollError);
            inputs.forEach(input => replacements.set(input, "[Unknown Poll]"));
            return;
        }

        // B. Process Q (Question)
        inputs.forEach(input => {
            if (input.startsWith('[[Q')) {
                // Stage 0 -> Use Instructions ("Question" field)
                // Stage 1+ -> Use Title
                if (poll.stage === 0) {
                    replacements.set(input, poll.instructions || poll.title);
                } else {
                    replacements.set(input, poll.title);
                }
            }
        });

        // C. Process A (Answer), P (Points), or F (Feedback) - Specific to User
        const hasUserReq = inputs.some(i => i.startsWith('[[A') || i.startsWith('[[P') || i.startsWith('[[F'));
        if (hasUserReq) {

            // Special Handling for Quad Sorting
            if (poll.type === 'quad_sorting') {
                const { data: votes } = await supabase
                    .from('poll_votes')
                    .select('selected_object_id, points_earned, chosen_side')
                    .eq('poll_id', poll.id)
                    .eq('user_id', userId);

                if (!votes || votes.length === 0) {
                    inputs.filter(i => i.startsWith('[[A')).forEach(i => replacements.set(i, "[Not Answered]"));
                    inputs.filter(i => i.startsWith('[[P')).forEach(i => replacements.set(i, "0"));
                    inputs.filter(i => i.startsWith('[[F')).forEach(i => replacements.set(i, ""));
                } else {
                    // Points
                    const totalPoints = votes.reduce((sum, v) => sum + (v.points_earned || 0), 0);
                    inputs.filter(i => i.startsWith('[[P')).forEach(i => replacements.set(i, totalPoints.toString()));

                    // Answer: Visual Representation
                    const getIndex = (id: string) => {
                        const parts = id.split(':');
                        return parseInt(parts[parts.length - 1]);
                    };

                    const groupAIds = votes.filter(v => v.chosen_side === 'group_a').map(v => v.selected_object_id);
                    const groupBIds = votes.filter(v => v.chosen_side === 'group_b').map(v => v.selected_object_id);

                    // @ts-ignore
                    const getObj = (id: string) => poll.poll_objects.find((o: any) => o.id === id);

                    // Generate HTML for images
                    const renderGroup = (ids: string[], label: string) => {
                        const imagesHtml = ids.map(id => {
                            const obj = getObj(id);
                            if (!obj?.image_url) return '';
                            return `<div style="width: 150px; height: 150px; border-radius: 8px; overflow: hidden; border: 1px solid #ccc;"><img src="${obj.image_url}" style="width: 100%; height: 100%; object-fit: cover;" /></div>`;
                        }).join('');
                        return `
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                                <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; color: #666;">${label}</div>
                                <div style="display: flex; gap: 8px; flex-wrap: wrap;">${imagesHtml}</div>
                            </div>
                        `;
                    };

                    const visualHtml = `
                        <div style="display: flex; gap: 16px; margin-bottom: 12px; background: #f9f9f9; padding: 12px; border-radius: 12px; border: 1px solid #eee;">
                            ${renderGroup(groupAIds, "Group 1")}
                            <div style="width: 1px; background: #ddd;"></div>
                            ${renderGroup(groupBIds, "Group 2")}
                        </div>
                    `;

                    // Logic to determine pairing and text
                    const groupAIndices = groupAIds.map(getIndex);
                    const groupBIndices = groupBIds.map(getIndex);

                    let partnerIndex = -1;
                    if (groupAIndices.includes(1)) {
                        partnerIndex = groupAIndices.find(i => i !== 1) || -1;
                    } else if (groupBIndices.includes(1)) {
                        partnerIndex = groupBIndices.find(i => i !== 1) || -1;
                    }

                    let groupingText = "";
                    let pairKey = "";

                    if (partnerIndex === 2) {
                        pairKey = '1-2';
                        groupingText = "Grouped by Demeanor";
                    } else if (partnerIndex === 3) {
                        pairKey = '1-3';
                        groupingText = "Grouped by Race";
                    } else if (partnerIndex === 4) {
                        pairKey = '1-4';
                        groupingText = "Grouped by Gender";
                    }

                    const finalAnswerHtml = `
                        <div>
                            <div style="font-weight: bold; font-size: 14px; color: #111; margin-bottom: 8px;">${groupingText}</div>
                            ${visualHtml}
                        </div>
                    `;

                    inputs.filter(i => i.startsWith('[[A')).forEach(i => replacements.set(i, finalAnswerHtml));

                    // Feedback
                    let feedbackText = "";
                    if (poll.quad_feedback && pairKey) {
                        // @ts-ignore
                        feedbackText = poll.quad_feedback[pairKey] || "";
                    }
                    inputs.filter(i => i.startsWith('[[F')).forEach(i => replacements.set(i, feedbackText));
                }

            } else {
                // Standard Logic (ISIT, MC)
                const { data: vote, error: voteError } = await supabase
                    .from('poll_votes')
                    .select('selected_object_id, points_earned')
                    .eq('poll_id', poll.id) // Use the ID we just found
                    .eq('user_id', userId)
                    .single();

                if (voteError || !vote) {
                    // User hasn't voted or error
                    inputs.filter(i => i.startsWith('[[A')).forEach(i => replacements.set(i, "[Not Answered]"));
                    inputs.filter(i => i.startsWith('[[P')).forEach(i => replacements.set(i, "0"));
                    inputs.filter(i => i.startsWith('[[F')).forEach(i => replacements.set(i, "")); // Empty string for missing feedback
                } else {
                    // Answer Text
                    // @ts-ignore - supabase types might be loose here
                    const selectedObj = poll.poll_objects.find((obj: any) => obj.id === vote.selected_object_id);
                    const answerText = selectedObj ? selectedObj.text : "[Unknown Option]";

                    inputs.filter(i => i.startsWith('[[A')).forEach(i => replacements.set(i, answerText));

                    // Points
                    const points = vote.points_earned !== null ? vote.points_earned.toString() : "0";
                    inputs.filter(i => i.startsWith('[[P')).forEach(i => replacements.set(i, points));

                    // Feedback
                    const feedback = selectedObj && selectedObj.feedback ? selectedObj.feedback : "";
                    inputs.filter(i => i.startsWith('[[F')).forEach(i => replacements.set(i, feedback));
                }
            }
        }
    });

    await Promise.all(queries);

    // 4. Perform Replacement
    // Use resolvedText here!
    return resolvedText.replace(regex, (match) => {
        return replacements.get(match) || match;
    });
}
