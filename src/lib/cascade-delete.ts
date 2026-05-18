import { supabase } from "@/integrations/supabase/client";

/**
 * Delete a client and its dependent records.
 * Tables without FKs are cleaned manually here.
 */
export async function deleteClientCascade(clientId: string) {
  await supabase.from("client_history").delete().eq("client_id", clientId);
  await supabase.from("client_services").delete().eq("client_id", clientId);
  await supabase.from("client_briefings").delete().eq("client_id", clientId);
  await supabase.from("proposals").delete().eq("client_id", clientId);
  // Detach tasks / opportunities instead of deleting them
  await supabase.from("tasks").update({ client_id: null }).eq("client_id", clientId);
  await supabase
    .from("opportunities")
    .update({ converted_client_id: null })
    .eq("converted_client_id", clientId);

  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw error;
}

/**
 * Delete a service and its dependent links.
 */
export async function deleteServiceCascade(serviceId: string) {
  await supabase.from("service_young_people").delete().eq("service_id", serviceId);
  await supabase.from("client_services").delete().eq("service_id", serviceId);
  await supabase.from("tasks").update({ service_id: null }).eq("service_id", serviceId);

  const { error } = await supabase.from("services").delete().eq("id", serviceId);
  if (error) throw error;
}
