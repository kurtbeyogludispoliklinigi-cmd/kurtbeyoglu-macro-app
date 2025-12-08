
import { createClient } from '@supabase/supabase-js';

// Read from env vars (simulated)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAccess() {
    console.log('Testing access to patients table...');
    const { data, error } = await supabase.from('patients').select('*').limit(5);

    if (error) {
        console.error('Error fetching patients:', error.message);
        console.log('RLS is likely BLOCKING access because we are not authenticated.');
    } else {
        console.log(`Success! Fetched ${data.length} patients.`);
        if (data.length === 0) {
            console.log('Returned 0 rows. This might mean RLS is filtering everything out (auth.uid() mismatch).');
        } else {
            console.log('Returned rows. RLS might not be active or is permissive.');
        }
    }
}

testAccess();
