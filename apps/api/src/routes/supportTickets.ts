import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../lib/supabase.js";
import {
  verifyAuth,
  requireRole,
  requireSuperAdmin,
} from "../middleware/auth.js";
import {
  ApiResponse,
  SupportTicket,
  TicketMessage,
  CreateTicketBody,
  UpdateTicketStatusBody,
} from "@shoplift/types";

const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL;

/**
 * assertTicketAccess
 *
 * Enforced access:
 * - customer: ticket.customer_id must equal request.user.uid
 * - restaurant_admin: ticket.restaurant_id must equal request.user.restaurantId
 * - super_admin: allow all
 */
function assertTicketAccess(
  ticket: any,
  user: any,
  reply: FastifyReply,
): boolean {
  if (user.role === "super_admin") return true;

  if (user.role === "customer") {
    if (ticket.customer_id !== user.uid) {
      reply.status(403).send({
        success: false,
        data: null,
        error: "Forbidden: You do not have access to this support ticket",
      } as ApiResponse<null>);
      return false;
    }
    return true;
  }

  if (user.role === "restaurant_admin") {
    if (ticket.restaurant_id !== user.restaurantId) {
      reply.status(403).send({
        success: false,
        data: null,
        error:
          "Forbidden: This support ticket does not belong to your restaurant",
      } as ApiResponse<null>);
      return false;
    }
    return true;
  }

  reply.status(403).send({
    success: false,
    data: null,
    error: "Forbidden: Access denied",
  } as ApiResponse<null>);
  return false;
}

export default async function supportTicketRoutes(fastify: FastifyInstance) {
  // POST /support/tickets
  fastify.post<{ Body: CreateTicketBody }>(
    "/tickets",
    { preHandler: [verifyAuth, requireRole("customer")] },
    async (request: any, reply) => {
      const { orderId, restaurantId, issueType, message } = request.body;
      const customerId = request.user.uid;

      // 1. Insert ticket
      const { data: newTicket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          customer_id: customerId,
          order_id: orderId ?? null,
          restaurant_id: restaurantId ?? null,
          issue_type: issueType,
          status: "open",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (ticketError || !newTicket) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: ticketError?.message || "Failed to create support ticket",
        } as ApiResponse<null>);
      }

      // 2. Insert message
      const { error: messageError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: newTicket.id,
          sender_id: customerId,
          sender_role: "customer",
          body: message,
          created_at: new Date().toISOString(),
        });

      if (messageError) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: messageError.message || "Failed to create opening message",
        } as ApiResponse<null>);
      }

      // 3. Fire-and-forget to n8n
      if (N8N_WEBHOOK_BASE_URL) {
        fetch(`${N8N_WEBHOOK_BASE_URL}/support-ticket`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId: newTicket.id,
            customerId,
            customerEmail: request.user.email,
            issueType,
            orderId,
            restaurantId,
            message,
          }),
        }).catch(() => {});
      }

      // 4. Return
      return reply.status(201).send({
        success: true,
        data: newTicket,
        error: null,
      } as ApiResponse<SupportTicket>);
    },
  );

  // GET /support/tickets
  fastify.get(
    "/tickets",
    { preHandler: [verifyAuth, requireRole("customer")] },
    async (request: any, reply) => {
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("customer_id", request.user.uid)
        .order("created_at", { ascending: false });

      if (error) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message,
        } as ApiResponse<null>);
      }

      return reply.send({
        success: true,
        data: tickets,
        error: null,
      } as ApiResponse<SupportTicket[]>);
    },
  );

  // GET /support/tickets/:id
  fastify.get<{ Params: { id: string } }>(
    "/tickets/:id",
    {
      preHandler: [
        verifyAuth,
        requireRole("customer", "restaurant_admin", "super_admin"),
      ],
    },
    async (request: any, reply) => {
      const { id } = request.params;

      // Fetch ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (ticketError || !ticket) {
        return reply.status(404).send({
          success: false,
          data: null,
          error: "Support ticket not found",
        } as ApiResponse<null>);
      }

      // Access check
      if (!assertTicketAccess(ticket, request.user, reply)) return;

      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });

      if (messagesError) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: messagesError.message,
        } as ApiResponse<null>);
      }

      return reply.send({
        success: true,
        data: { ticket, messages },
        error: null,
      } as ApiResponse<{ ticket: SupportTicket; messages: TicketMessage[] }>);
    },
  );

  // PATCH /support/tickets/:id/status
  fastify.patch<{ Params: { id: string }; Body: UpdateTicketStatusBody }>(
    "/tickets/:id/status",
    { preHandler: [verifyAuth, requireSuperAdmin] },
    async (request: any, reply) => {
      const { id } = request.params;
      const { status } = request.body;

      const allowedStatuses = [
        "open",
        "auto_resolved",
        "pending_human",
        "ai_responded",
        "resolved",
        "escalated",
      ];
      if (!allowedStatuses.includes(status)) {
        return reply.status(400).send({
          success: false,
          data: null,
          error: "Invalid status value",
        } as ApiResponse<null>);
      }

      const updateData: any = { status };
      if (status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data: updatedTicket, error } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Support ticket not found",
          } as ApiResponse<null>);
        }
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message,
        } as ApiResponse<null>);
      }

      return reply.send({
        success: true,
        data: updatedTicket,
        error: null,
      } as ApiResponse<SupportTicket>);
    },
  );

  // POST /support/tickets/:id/messages
  fastify.post<{ Params: { id: string }; Body: { body: string } }>(
    "/tickets/:id/messages",
    {
      preHandler: [
        verifyAuth,
        requireRole("customer", "restaurant_admin", "super_admin"),
      ],
    },
    async (request: any, reply) => {
      const { id } = request.params;
      const { body } = request.body;

      // Fetch ticket first for access check
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (ticketError || !ticket) {
        return reply.status(404).send({
          success: false,
          data: null,
          error: "Support ticket not found",
        } as ApiResponse<null>);
      }

      if (!assertTicketAccess(ticket, request.user, reply)) return;

      const { data: newMessage, error: insertError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: id,
          sender_id: request.user.uid,
          sender_role: request.user.role,
          body: body,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        return reply.status(500).send({
          success: false,
          data: null,
          error: insertError.message,
        } as ApiResponse<null>);
      }

      return reply.status(201).send({
        success: true,
        data: newMessage,
        error: null,
      } as ApiResponse<TicketMessage>);
    },
  );
}
