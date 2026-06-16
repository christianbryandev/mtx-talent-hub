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
  await supabase.from("tasks").delete().eq("client_id", clientId);
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
  await supabase.from("opportunity_services").delete().eq("service_id", serviceId);
  await supabase.from("tasks").update({ service_id: null }).eq("service_id", serviceId);

  const { error } = await supabase.from("services").delete().eq("id", serviceId);
  if (error) throw error;
}

/**
 * Delete an opportunity and its dependent records.
 */
export async function deleteOpportunityCascade(opportunityId: string) {
  await supabase.from("opportunity_services").delete().eq("opportunity_id", opportunityId);
  await supabase.from("opportunity_interactions").delete().eq("opportunity_id", opportunityId);
  await supabase.from("proposals").delete().eq("opportunity_id", opportunityId);
  await supabase.from("tasks").delete().eq("opportunity_id", opportunityId);

  const { error } = await supabase.from("opportunities").delete().eq("id", opportunityId);
  if (error) throw error;
}

/**
 * Delete a task and its dependent records.
 */
export async function deleteTaskCascade(taskId: string) {
  await supabase.from("task_checklists").delete().eq("task_id", taskId);
  await supabase.from("task_attachments").delete().eq("task_id", taskId);
  await supabase.from("task_comments").delete().eq("task_id", taskId);
  await supabase.from("meeting_tasks").delete().eq("task_id", taskId);

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

/**
 * Delete a meeting and its dependent records.
 */
export async function deleteMeetingCascade(meetingId: string) {
  await supabase.from("meeting_participants").delete().eq("meeting_id", meetingId);
  await supabase.from("meeting_agenda_items").delete().eq("meeting_id", meetingId);
  await supabase.from("meeting_tasks").delete().eq("meeting_id", meetingId);
  await supabase.from("young_attendance").delete().eq("meeting_id", meetingId);

  const { error } = await supabase.from("meetings").delete().eq("id", meetingId);
  if (error) throw error;
}

/**
 * Delete a young person and dependent records.
 */
export async function deleteYoungCascade(youngId: string) {
  await supabase.from("service_young_people").delete().eq("young_id", youngId);
  await supabase.from("young_attendance").delete().eq("young_id", youngId);
  await supabase.from("young_evolution").delete().eq("young_id", youngId);
  await supabase.from("journey_phases").delete().eq("young_id", youngId);
  await supabase.from("meeting_participants").delete().eq("young_id", youngId);
  await supabase.from("tasks").update({ young_responsible: null }).eq("young_responsible", youngId);
  await supabase.from("clients").update({ young_responsible: null }).eq("young_responsible", youngId);

  const { error } = await supabase.from("young_people").delete().eq("id", youngId);
  if (error) throw error;
}
