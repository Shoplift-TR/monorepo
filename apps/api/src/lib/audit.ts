import { db, auditLogs } from "@shoplift/db";

export async function writeAuditLog(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  payload?: object;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      payload: params.payload,
      ipAddress: params.ipAddress,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
