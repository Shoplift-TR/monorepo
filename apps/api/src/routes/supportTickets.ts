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
import { db, supportTickets, ticketMessages } from "@shoplift/db";
import { eq, and, desc, asc } from "drizzle-orm";

const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL;

/**
 * assertTicketAccess
 */
function assertTicketAccess(
  ticket: any,
  user: any,
  reply: FastifyReply,
): boolean {
  if (user.role === "super_admin") return true;

  if (user.role === "customer") {
    if (ticket.customerId !== user.uid) {
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
    if (ticket.restaurantId !== user.restaurantId) {
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

      try {
        // 1. Insert ticket
        const ticketResult = await db
          .insert(supportTickets)
          .values({
            customerId: customerId,
            orderId: orderId ?? null,
            restaurantId: restaurantId ?? null,
            issueType: issueType,
            status: "open",
          })
          .returning();

        const newTicket = ticketResult[0];

        // 2. Insert message
        await db.insert(ticketMessages).values({
          ticketId: newTicket.id,
          senderId: customerId,
          senderRole: "customer",
          body: message,
        });

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

        return reply.status(201).send({
          success: true,
          data: newTicket,
          error: null,
        } as unknown as ApiResponse<SupportTicket>);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message || "Failed to create support ticket",
        } as ApiResponse<null>);
      }
    },
  );

  // GET /support/tickets
  fastify.get(
    "/tickets",
    { preHandler: [verifyAuth, requireRole("customer")] },
    async (request: any, reply) => {
      try {
        const tickets = await db
          .select()
          .from(supportTickets)
          .where(eq(supportTickets.customerId, request.user.uid))
          .orderBy(desc(supportTickets.createdAt));

        return reply.send({
          success: true,
          data: tickets,
          error: null,
        } as unknown as ApiResponse<SupportTicket[]>);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message,
        } as ApiResponse<null>);
      }
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

      try {
        // Fetch ticket
        const ticketResult = await db
          .select()
          .from(supportTickets)
          .where(eq(supportTickets.id, id))
          .limit(1);

        const ticket = ticketResult[0];

        if (!ticket) {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Support ticket not found",
          } as ApiResponse<null>);
        }

        // Access check
        if (!assertTicketAccess(ticket, request.user, reply)) return;

        // Fetch messages
        const messages = await db
          .select()
          .from(ticketMessages)
          .where(eq(ticketMessages.ticketId, id))
          .orderBy(asc(ticketMessages.createdAt));

        return reply.send({
          success: true,
          data: { ticket, messages },
          error: null,
        } as unknown as ApiResponse<{
          ticket: SupportTicket;
          messages: TicketMessage[];
        }>);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message,
        } as ApiResponse<null>);
      }
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
        updateData.resolvedAt = new Date();
      }

      try {
        const result = await db
          .update(supportTickets)
          .set(updateData)
          .where(eq(supportTickets.id, id))
          .returning();

        const updatedTicket = result[0];

        if (!updatedTicket) {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Support ticket not found",
          } as ApiResponse<null>);
        }

        return reply.send({
          success: true,
          data: updatedTicket,
          error: null,
        } as unknown as ApiResponse<SupportTicket>);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message,
        } as ApiResponse<null>);
      }
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

      try {
        // Fetch ticket first for access check
        const ticketResult = await db
          .select()
          .from(supportTickets)
          .where(eq(supportTickets.id, id))
          .limit(1);

        const ticket = ticketResult[0];

        if (!ticket) {
          return reply.status(404).send({
            success: false,
            data: null,
            error: "Support ticket not found",
          } as ApiResponse<null>);
        }

        if (!assertTicketAccess(ticket, request.user, reply)) return;

        const messageResult = await db
          .insert(ticketMessages)
          .values({
            ticketId: id,
            senderId: request.user.uid,
            senderRole: request.user.role,
            body: body,
          })
          .returning();

        const newMessage = messageResult[0];

        return reply.status(201).send({
          success: true,
          data: newMessage,
          error: null,
        } as unknown as ApiResponse<TicketMessage>);
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({
          success: false,
          data: null,
          error: error.message,
        } as ApiResponse<null>);
      }
    },
  );
}
