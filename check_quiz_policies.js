import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
// Se não achar, tenta .env.local
if (!process.env.VITE_SUPABASE_URL) {
  dotenv.config({ path: '.env.local' });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('pg_policies').select('*').in('tablename', ['quiz_questions', 'quiz_options']);
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
