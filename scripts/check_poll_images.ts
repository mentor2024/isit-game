
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPollImages() {
    // Use the exact query from page.tsx:
    // .select('*, poll_objects(*), poll_votes(count)')
    // We'll limit to one known image poll for brevity
    const knownImagePollId = '835f46b1-68e9-409b-8789-0ca227110682'; // from previous output

    console.log(`Checking poll ${knownImagePollId}...`);

    const { data: poll, error } = await supabase
        .from('polls')
        .select('*, poll_objects(*), poll_votes(count)')
        .eq('id', knownImagePollId)
        .single();

    if (error) {
        console.error('Error fetching poll:', error);
        return;
    }

    if (!poll) {
        console.log('Poll not found');
        return;
    }

    console.log('Poll data retrieved successfully:');
    console.log('Title:', poll.title);
    console.log('Type:', poll.type);
    console.log('Poll Objects:', JSON.stringify(poll.poll_objects, null, 2));

    if (!poll.poll_objects || poll.poll_objects.length === 0) {
        console.error('ERROR: No poll_objects found in the response! The relationship might be missing.');
    } else {
        const hasImages = poll.poll_objects.some((o: any) => !!o.image_url);
        console.log('Has images:', hasImages);
    }
}

checkPollImages();
