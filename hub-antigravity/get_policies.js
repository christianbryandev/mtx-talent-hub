import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'opportunities' });
  if (error) {
    // If rpc doesn't exist, we can query pg_policies directly
    const { data: policies, error: polErr } = await supabase.from('pg_policies').select('*').eq('tablename', 'opportunities');
    if (polErr) {
      console.error(polErr);
    } else {
      console.log(JSON.stringify(policies, null, 2));
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
