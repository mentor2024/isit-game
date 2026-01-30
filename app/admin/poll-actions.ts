"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Client for checking permissions
async function checkRole() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll() { }
            }
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const serviceClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );

    const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role;
}

// Service Role Client for Mutating Data (Bypassing potential RLS issues for admin actions)
function createServiceRoleClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );
}

export async function createPoll(formData: FormData) {
    const currentRole = await checkRole();
    if (currentRole !== 'admin' && currentRole !== 'superadmin') {
        throw new Error("Unauthorized");
    }

    const type = (formData.get("type") as string) || "text_isit";
    const title = formData.get("title") as string;
    const instructions = formData.get("instructions") as string;
    const instructions_correct = formData.get("instructions_correct") as string;
    const instructions_incorrect = formData.get("instructions_incorrect") as string;
    const stage = parseInt(formData.get("stage") as string);
    // If NaN, default to 1. If 0, keep 0.
    const safeStage = isNaN(stage) ? 1 : stage;
    const level = parseInt(formData.get("level") as string) || 1;
    const poll_order = parseInt(formData.get("poll_order") as string) || 1;

    // Common validations
    if (!title || !type) {
        throw new Error("Missing required fields");
    }

    const supabase = createServiceRoleClient();

    // Extract Quad Scores if applicable
    let quad_scores = {};
    if (type === 'quad_sorting') {
        quad_scores = {
            '1-2': parseInt(formData.get("score_12") as string) || 0,
            '1-3': parseInt(formData.get("score_13") as string) || 0,
            '1-4': parseInt(formData.get("score_14") as string) || 0
        };
    }

    // 1. Create Poll
    const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({ title, instructions, instructions_correct, instructions_incorrect, stage: safeStage, level, poll_order, type, quad_scores })
        .select()
        .single();

    if (pollError) throw new Error(pollError.message);

    try {
        // 2. Process Objects (Upload if needed)
        const objects = [];

        // Determine object count based on type
        let objectCount = 2;
        if (type === 'quad_sorting') {
            objectCount = 4;
        } else if (type === 'multiple_choice') {
            const explicitCount = parseInt(formData.get("object_count") as string);
            objectCount = !isNaN(explicitCount) ? explicitCount : 5;
        }

        for (let i = 1; i <= objectCount; i++) {
            const side = formData.get(`obj${i}_side`) as string;
            const textInput = formData.get(`obj${i}_text`) as string;
            const fileInput = formData.get(`obj${i}_image`) as File;

            let imageUrl = null;
            // Text is always required as label/content
            let text = textInput;

            // For Quad Sorting OR Image ISIT, we expect images
            const needsImage = type === "image_isit" || type === "quad_sorting";

            if (needsImage) {
                if (!fileInput || fileInput.size === 0) throw new Error(`Image for Object ${i} is missing`);

                // Upload Image
                const fileExt = fileInput.name.split('.').pop();
                const filePath = `${poll.id}/${i}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase
                    .storage
                    .from('poll_images')
                    .upload(filePath, fileInput, {
                        contentType: fileInput.type,
                        upsert: true
                    });

                if (uploadError) throw new Error(`Upload failed for Object ${i}: ${uploadError.message}`);

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage.from('poll_images').getPublicUrl(filePath);
                imageUrl = publicUrl;
            } else {
                if (!textInput) throw new Error(`Text for Object ${i} is missing`);
            }

            const newObj: any = {
                id: `poll:${poll.id}:${i}`,
                poll_id: poll.id,
                text: text,
                image_url: imageUrl
            };

            if (type === 'quad_sorting') {
                // For Quad Sorting, we don't have IS/IT side, but maybe store sort_id in attributes?
                // Or actually, the drag and drop component relies on 'attributes' -> 'sort_id'.
                // Let's assume the order (1,2,3,4) is the 'sort_id' implicitly or explicitly.
                // We'll store it in 'attributes' column if available (migration 20260127_add_poll_attributes.sql added it).
                newObj.attributes = { sort_id: i };
                newObj.attributes = { sort_id: i };
            } else {
                // For ISIT, we use correct_side
                if (side) newObj.correct_side = side;
            }

            // Handle Points (Multiple Choice)
            const pointsInput = formData.get(`obj${i}_points`);
            if (pointsInput !== null) {
                newObj.points = parseInt(pointsInput as string) || 0;
            }

            objects.push(newObj);
        }

        // 3. Insert Objects
        const { error: objsError } = await supabase
            .from('poll_objects')
            .insert(objects);

        if (objsError) throw new Error(objsError.message);

    } catch (e: any) {
        // Cleanup poll if objects/upload fail
        await supabase.from('polls').delete().eq('id', poll.id);
        throw new Error(e.message);
    }

    revalidatePath('/admin');
    revalidatePath('/poll');
}

export async function deletePoll(formData: FormData) {
    const currentRole = await checkRole();
    if (currentRole !== 'admin' && currentRole !== 'superadmin') {
        throw new Error("Unauthorized");
    }

    const pollId = formData.get("pollId") as string;
    const supabase = createServiceRoleClient();

    // Cascade delete handles objects/votes usually, provided FK is set up with ON DELETE CASCADE
    const { error } = await supabase.from('polls').delete().eq('id', pollId);

    if (error) throw new Error(error.message);

    revalidatePath('/admin');
    revalidatePath('/poll');
}

export async function updatePoll(formData: FormData) {
    console.log("------- UPDATE POLL ACTION CALLED -------");
    const currentRole = await checkRole();
    if (currentRole !== 'admin' && currentRole !== 'superadmin') {
        throw new Error("Unauthorized");
    }

    const pollId = formData.get("pollId") as string;
    const title = formData.get("title") as string;
    const instructions = formData.get("instructions") as string;
    const instructions_correct = formData.get("instructions_correct") as string;
    const instructions_incorrect = formData.get("instructions_incorrect") as string;

    if (!pollId || !title) {
        throw new Error("Missing required fields");
    }

    const supabase = createServiceRoleClient();

    const stageRaw = parseInt(formData.get("stage") as string);
    const stage = isNaN(stageRaw) ? 1 : stageRaw;
    console.log(`[updatePoll] Stage Update: Raw=${formData.get("stage")} Parsed=${stageRaw} Final=${stage}`);

    const level = parseInt(formData.get("level") as string) || 1;
    const poll_order = parseInt(formData.get("poll_order") as string) || 1;

    // Extract Quad Scores if provided (edit form includes them if type is quad_sorting)
    const updates: any = { title, instructions, instructions_correct, instructions_incorrect, stage, level, poll_order };

    if (formData.has("score_12")) {
        updates.quad_scores = {
            '1-2': parseInt(formData.get("score_12") as string) || 0,
            '1-3': parseInt(formData.get("score_13") as string) || 0,
            '1-4': parseInt(formData.get("score_14") as string) || 0
        };
    }

    // 1. Update Poll Details
    const { error: pollError } = await supabase
        .from('polls')
        .update(updates)
        .eq('id', pollId);

    if (pollError) throw new Error(pollError.message);

    // 2. Update Objects if provided. 
    // We iterate 1 to 4 to cover all potential objects (Quad or ISIT).
    if (formData.has("obj1_text")) {
        try {
            const processObjectUpdate = async (index: number) => {
                // If this form field doesn't exist, skip it (e.g. updating a 2-object poll vs 4-object)
                const textInput = formData.get(`obj${index}_text`) as string;
                if (textInput === null) return; // Field not present in form

                const explicitId = formData.get(`obj${index}_id`) as string;
                // Use explicit ID if provided (handles 'opt' suffix etc), otherwise fallback to construct
                const objectId = explicitId || `poll:${pollId}:${index}`;

                console.log(`[updatePoll] Object ${index}: ID=${objectId}`);

                const side = formData.get(`obj${index}_side`) as string;
                const fileInput = formData.get(`obj${index}_image`) as File;

                // Prepare update payload
                const updates: any = {
                    text: textInput
                };

                if (side) {
                    updates.correct_side = side;
                }

                // Handle Variable Points
                const pointsInput = formData.get(`obj${index}_points`);
                console.log(`[updatePoll] Object ${index}: Points Input = ${pointsInput} (Type: ${typeof pointsInput})`);

                if (pointsInput !== null) {
                    updates.points = parseInt(pointsInput as string) || 0;
                    console.log(`[updatePoll] Object ${index}: Setting updates.points = ${updates.points}`);
                }

                // Handle Image Upload if new file provided
                if (fileInput && fileInput.size > 0) {
                    const fileExt = fileInput.name.split('.').pop();
                    const filePath = `${pollId}/${index}_${Date.now()}.${fileExt}`;

                    const { error: uploadError } = await supabase
                        .storage
                        .from('poll_images')
                        .upload(filePath, fileInput, {
                            contentType: fileInput.type,
                            upsert: true
                        });

                    if (uploadError) throw new Error(`Upload failed for Object ${index}: ${uploadError.message}`);

                    const { data: { publicUrl } } = supabase.storage.from('poll_images').getPublicUrl(filePath);
                    updates.image_url = publicUrl;
                }

                // Perform Update
                // We use Upsert logic here for robustness? No, Update is fine if ID is consistent.
                // But wait, if we switch poll types via Update (not UI supported yet), ID strategy holds.
                const { error: updateError } = await supabase
                    .from('poll_objects')
                    .update(updates)
                    .eq('id', objectId);

                // Note: If object doesn't exist (e.g. converting 2-obj to 4-obj via Edit?), Update will allow count=0 without error.
                // But for standard Edit flow where type doesn't change, objects exist.
                if (updateError) throw new Error(`Failed to update Object ${index}: ${updateError.message}`);
            };

            for (let i = 1; i <= 5; i++) {
                await processObjectUpdate(i);
            }

        } catch (e: any) {
            throw new Error(e.message);
        }
    }

    revalidatePath('/admin');
    revalidatePath('/poll');
    redirect(`/admin/polls/${pollId}`);
}

export async function updatePollHierarchyField(pollId: string, field: 'stage' | 'level' | 'poll_order', value: number) {
    const currentRole = await checkRole();
    if (currentRole !== 'admin' && currentRole !== 'superadmin') {
        throw new Error("Unauthorized");
    }

    const supabase = createServiceRoleClient();

    // Validate value within limits. Stage can be 0.
    const minVal = field === 'stage' ? 0 : 1;
    const safeValue = Math.max(minVal, Math.min(20, value));

    const { error } = await supabase
        .from('polls')
        .update({ [field]: safeValue })
        .eq('id', pollId);

    if (error) throw new Error(error.message);

    revalidatePath('/admin');
    revalidatePath('/poll');
}

export async function clonePoll(pollId: string) {
    const currentRole = await checkRole();
    if (currentRole !== 'admin' && currentRole !== 'superadmin') {
        throw new Error("Unauthorized");
    }

    const supabase = createServiceRoleClient();

    // 1. Fetch Original
    const { data: original, error: fetchError } = await supabase
        .from('polls')
        .select('*, poll_objects(*)')
        .eq('id', pollId)
        .single();

    if (fetchError || !original) throw new Error("Poll not found");

    // 2. Create Clone
    const { data: newPoll, error: createError } = await supabase
        .from('polls')
        .insert({
            title: `Copy of ${original.title}`,
            instructions: original.instructions,
            instructions_correct: original.instructions_correct,
            instructions_incorrect: original.instructions_incorrect,
            type: original.type,
            stage: original.stage,
            level: original.level,
            poll_order: original.poll_order
        })
        .select()
        .single();

    if (createError) throw new Error(createError.message);

    // 3. Clone Objects
    if (original.poll_objects && original.poll_objects.length > 0) {
        const newObjects = original.poll_objects.map((obj: any, index: number) => ({
            id: `poll:${newPoll.id}:${index + 1}`, // Re-generate ID based on new poll ID
            poll_id: newPoll.id,
            text: obj.text,
            correct_side: obj.correct_side,
            image_url: obj.image_url // Copy the URL directly (sharing the same image file)
        }));

        const { error: objError } = await supabase
            .from('poll_objects')
            .insert(newObjects);

        if (objError) {
            // Optional: cleanup new poll if objects fail
            console.error("Failed to clone objects:", objError);
        }
    }

    revalidatePath('/admin');
    return { success: true, newId: newPoll.id };
}
