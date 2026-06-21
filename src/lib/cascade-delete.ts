import { supabase } from "@/integrations/supabase/client";

/**
 * Delete a client and its dependent records.
 * Tables without FKs are cleaned manually here.
 * Also reverts young people income/status that originated from this client.
 */
export async function deleteClientCascade(clientId: string) {
  // Buscar serviços do cliente para reverter renda dos jovens
  const { data: clientServices } = await supabase
    .from("client_services")
    .select("id, service_id, monthly_value, executor_id")
    .eq("client_id", clientId);

  // Reverter total_income_generated dos jovens vinculados a este cliente
  if (clientServices && clientServices.length > 0) {
    const revenueByYoung = new Map<string, number>();
    for (const cs of clientServices) {
      if (!cs.executor_id) continue;
      const revenue = Number(cs.monthly_value) || 0;
      revenueByYoung.set(
        cs.executor_id,
        (revenueByYoung.get(cs.executor_id) ?? 0) + revenue,
      );
    }

    for (const [youngId, revenueToRemove] of revenueByYoung) {
      const { data: young } = await supabase
        .from("young_people")
        .select("total_income_generated")
        .eq("id", youngId)
        .single();
      const current = Number(young?.total_income_generated) || 0;
      const newIncome = Math.max(0, current - revenueToRemove);
      await supabase
        .from("young_people")
        .update({ total_income_generated: newIncome } as never)
        .eq("id", youngId);
    }

    // Verificar se algum jovem ficou sem nenhum outro cliente ativo e reverter first_client_attended
    const affectedYoungIds = [...revenueByYoung.keys()];
    for (const youngId of affectedYoungIds) {
      const { data: otherServices } = await supabase
        .from("client_services")
        .select("id")
        .eq("executor_id", youngId)
        .neq("client_id", clientId)
        .eq("status", "ativo")
        .limit(1);
      if (!otherServices || otherServices.length === 0) {
        await supabase
          .from("young_people")
          .update({ first_client_attended: false } as never)
          .eq("id", youngId);
      }
    }
  }

  await supabase.from("client_history").delete().eq("client_id", clientId);
  await supabase.from("client_services").delete().eq("client_id", clientId);
  await supabase.from("client_briefings").delete().eq("client_id", clientId);
  await supabase.from("proposals").delete().eq("client_id", clientId);
  await supabase.from("tasks").update({ client_id: null }).eq("client_id", clientId);

  // Reverter oportunidades "ganhas" vinculadas a esse cliente para "perdida"
  await supabase
    .from("opportunities")
    .update({ converted_client_id: null, status: "perdida", loss_reason: "Cliente excluído" } as never)
    .eq("converted_client_id", clientId)
    .eq("status", "ganha");

  // Limpar converted_client_id das demais (que não são "ganha")
  await supabase
    .from("opportunities")
    .update({ converted_client_id: null } as never)
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
  await supabase.from("tasks").update({ opportunity_id: null }).eq("opportunity_id", opportunityId);

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
