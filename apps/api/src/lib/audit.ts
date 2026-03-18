export async function writeAuditLog(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  payload?: object;
  ipAddress?: string;
}) {
  const { supabase } = await import("./supabase.js"); // lazy loading due to context

  await supabase.from("audit_logs").insert({
    admin_id: params.adminId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    payload: params.payload,
    ip_address: params.ipAddress,
  });
}
