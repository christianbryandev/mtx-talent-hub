import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Read .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("--- Supabase Client Connected ---");

  // 1. Check clients count
  const { data: clients, error: cErr } = await supabase.from('clients').select('*');
  console.log(`Clients count in DB: ${clients?.length ?? 0}`);
  if (clients?.length) {
    console.log("Clients details:", clients.map(c => ({ id: c.id, name: c.name, status: c.status })));
  }

  // 2. Check young people count
  const { data: youngs, error: yErr } = await supabase.from('young_people').select('*');
  console.log(`Young people count in DB: ${youngs?.length ?? 0}`);
  if (youngs?.length) {
    console.log("Young people sample:", youngs.map(y => ({ id: y.id, profile_id: y.profile_id, status: y.status, first_client_attended: y.first_client_attended })));
  }

  // 3. Check profiles and roles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log(`Profiles count: ${profiles?.length ?? 0}`);
  const { data: roles, error: rErr } = await supabase.from('user_roles').select('*');
  console.log(`User roles count: ${roles?.length ?? 0}`);

  // 4. Check user_phase_status
  const { data: ups, error: upsErr } = await supabase.from('user_phase_status').select('*');
  console.log(`User phase status count: ${ups?.length ?? 0}`);
  if (ups?.length) {
    console.log("User phase status user_ids:", [...new Set(ups.map(u => u.user_id))]);
  }

  // 5. Check activity_logs
  const { data: logs, error: lErr } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20);
  console.log(`Activity logs sample (latest 20):`);
  console.log(logs?.map(l => ({ id: l.id, action: l.action, description: l.description, entity_type: l.entity_type, entity_id: l.entity_id })));

  // 6. Run RPCs
  console.log("\n--- Run RPCs ---");
  const { data: kpis } = await supabase.rpc('get_journey_kpis');
  console.log("get_journey_kpis:", kpis);

  const { data: dist } = await supabase.rpc('get_journey_phase_distribution');
  console.log("get_journey_phase_distribution:", dist);

  const { data: conv } = await supabase.rpc('get_journey_conversion');
  console.log("get_journey_conversion:", conv);
}

run().catch(console.error);
