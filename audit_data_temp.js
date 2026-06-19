import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
if (!process.env.VITE_SUPABASE_URL) {
  dotenv.config({ path: '.env.local' });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== STARTING DATA AUDIT ===");

  // 1. Fetch young people
  const { data: youngPeople, error: ypError } = await supabase
    .from('young_people')
    .select('id, profile_id, status, full_name, email');
  if (ypError) {
    console.error("Error fetching young_people:", ypError);
    return;
  }
  console.log(`Total young_people rows: ${youngPeople.length}`);

  const activeYpProfileIds = new Set(
    youngPeople.filter(y => y.status === 'ativo' && y.profile_id).map(y => y.profile_id)
  );
  const allYpProfileIds = new Set(
    youngPeople.filter(y => y.profile_id).map(y => y.profile_id)
  );

  console.log(`Active young_people (status = 'ativo'): ${activeYpProfileIds.size}`);
  console.log(`All young_people profile_ids: ${allYpProfileIds.size}`);

  // 2. Fetch user roles with role = 'jovem_aprendiz'
  const { data: userRoles, error: urError } = await supabase
    .from('user_roles')
    .select('user_id, role');
  if (urError) {
    console.error("Error fetching user_roles:", urError);
    return;
  }

  const jovemAprendizUsers = userRoles.filter(ur => ur.role === 'jovem_aprendiz');
  console.log(`Total user_roles with role = 'jovem_aprendiz': ${jovemAprendizUsers.length}`);

  // 3. Profiles with role = 'jovem_aprendiz' but not active in young_people (deleted or inactive)
  const deletedOrInactiveJovens = [];
  const deletedJovens = []; // Not in young_people table at all
  const inactiveJovens = []; // In young_people but status != 'ativo'

  for (const ur of jovemAprendizUsers) {
    const profileId = ur.user_id;
    const yp = youngPeople.find(y => y.profile_id === profileId);
    if (!yp) {
      deletedJovens.push(profileId);
      deletedOrInactiveJovens.push({ profileId, reason: 'deleted (not in young_people)' });
    } else if (yp.status !== 'ativo') {
      inactiveJovens.push({ profileId, status: yp.status, name: yp.full_name });
      deletedOrInactiveJovens.push({ profileId, reason: `inactive (status: ${yp.status})` });
    }
  }

  console.log(`Jovens completely deleted (not in young_people): ${deletedJovens.length}`);
  console.log(`Jovens inactive (in young_people but status != 'ativo'): ${inactiveJovens.length}`);
  console.log(`Total non-active jovens with role 'jovem_aprendiz': ${deletedOrInactiveJovens.length}`);

  // 4. Audit progress tables for orphan/invalid data
  console.log("\n=== AUDITING PROGRESS TABLES ===");

  // Helper to fetch and audit
  async function auditTable(tableName, userFieldName = 'user_id') {
    const { data: rows, error } = await supabase
      .from(tableName)
      .select(`id, ${userFieldName}`);
    if (error) {
      console.error(`Error fetching from ${tableName}:`, error);
      return;
    }

    let orphanCount = 0;
    let inactiveCount = 0;
    const uniqueOrphanUsers = new Set();
    const uniqueInactiveUsers = new Set();

    for (const row of rows) {
      const userId = row[userFieldName];
      if (!allYpProfileIds.has(userId)) {
        orphanCount++;
        uniqueOrphanUsers.add(userId);
      } else if (!activeYpProfileIds.has(userId)) {
        inactiveCount++;
        uniqueInactiveUsers.add(userId);
      }
    }

    console.log(`Table: ${tableName}`);
    console.log(`  Total rows: ${rows.length}`);
    console.log(`  Orphan rows (user completely deleted): ${orphanCount} (from ${uniqueOrphanUsers.size} unique users)`);
    console.log(`  Inactive rows (user exists but status != 'ativo'): ${inactiveCount} (from ${uniqueInactiveUsers.size} unique users)`);
  }

  await auditTable('user_phase_status');
  await auditTable('journey_quiz_attempts');
  await auditTable('xp_events');
  await auditTable('user_checklist_progress');
  await auditTable('user_card_progress');

  // Let's run the actual RPC functions to see what they return before the fix
  console.log("\n=== RUNNING CURRENT RPCS ===");
  const { data: kpis, error: kpisErr } = await supabase.rpc('get_journey_kpis');
  console.log("get_journey_kpis output:", kpisErr ? kpisErr.message : kpis);

  const { data: phaseDist, error: phaseDistErr } = await supabase.rpc('get_journey_phase_distribution');
  console.log("get_journey_phase_distribution output:", phaseDistErr ? phaseDistErr.message : phaseDist);

  const { data: conversion, error: convErr } = await supabase.rpc('get_journey_conversion');
  console.log("get_journey_conversion output:", convErr ? convErr.message : conversion);
}

main();
