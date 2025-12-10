
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual env parsing to avoid adding dependencies
const envPath = path.resolve(process.cwd(), '.env.local');
let envConfig: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, 'utf-8');
    fileContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
            envConfig[key] = value;
        }
    });
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const tables = [
        'doctors',
        'patients',
        'treatments',
        'appointments',
        'doctor_queue',
        'treatment_catalog',
        'password_change_log'
    ];

    console.log('--- Checking Tables ---');
    for (const table of tables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error) {
            if (error.code === '42P01') { // undefined_table
                console.log(`❌ Table missing: ${table}`);
            } else {
                console.log(`⚠️ Error checking ${table}: ${error.message} (${error.code})`);
            }
        } else {
            console.log(`✅ Table exists: ${table}`);
        }
    }
}

async function checkColumns() {
    console.log('\n--- Checking Columns ---');
    // We can't easily check columns with just header requests without RLS potentially getting in the way or inserting dummy data.
    // Instead, we will try to select the specific columns from the table with limit 0

    // Check patients columns
    const { error: patientError } = await supabase.from('patients').select('assignment_type, assignment_date').limit(0);
    if (patientError) {
        console.log(`❌ 'patients' columns check failed: ${patientError.message}`);
    } else {
        console.log(`✅ 'patients' has required columns (assignment_type, assignment_date)`);
    }

    // Check doctors role constraint is harder to check via API without inserting. 
    // We will skip constraint check here and rely on review of migration sql.
}

async function main() {
    await checkTables();
    await checkColumns();
}

main();
