const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFilter() {
    console.log("Checking filter syntax...");

    // 1. Get a polling ID
    const { data: polls } = await supabase.from('polls').select('id').limit(1);
    const idToExclude = polls[0].id;
    console.log(`Excluding ID: ${idToExclude}`);

    // 2. Test Unquoted
    const { data: data1, error: error1 } = await supabase.from('polls').select('id').not('id', 'in', `(${idToExclude})`).limit(5);
    if (error1) console.error("Unquoted Error:", error1);
    else {
        const found = data1.find(p => p.id === idToExclude);
        console.log(`Unquoted Result contains excluded ID? ${!!found}`);
    }

    // 3. Test Quoted
    const { data: data2, error: error2 } = await supabase.from('polls').select('id').not('id', 'in', `("${idToExclude}")`).limit(5);
    if (error2) console.error("Quoted Error:", error2);
    else {
        const found = data2.find(p => p.id === idToExclude);
        console.log(`Quoted Result contains excluded ID? ${!!found}`);
    }
}

checkFilter();
