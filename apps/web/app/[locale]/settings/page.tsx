"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { showToast } from "@/lib/toast";
import { authApi } from "@/lib/api";

type SettingsTab = "account" | "preferences" | "support";

export default function SettingsPage() {
  const { user, updateUsername, rehydrate } = useAuth();
  const { locale } = useParams();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  // Account state
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Support state
  const [supportMessage, setSupportMessage] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [ticketsLoaded, setTicketsLoaded] = useState(false);

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: "account", label: "Account" },
    { id: "preferences", label: "Preferences" },
    { id: "support", label: "Support" },
  ];

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = newUsername
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 30);

    if (sanitized.length < 3) {
      showToast.error("Username must be at least 3 characters.");
      return;
    }

    setUsernameLoading(true);
    const { error } = await updateUsername(sanitized);
    if (error) {
      showToast.error(error);
    } else {
      showToast.success("Username updated successfully.");
      setNewUsername(sanitized);
    }
    setUsernameLoading(false);
  };

  const loadTickets = async () => {
    if (ticketsLoaded) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/support/tickets`,
        { credentials: "include" },
      );
      const json = await res.json();
      if (json.success) setTickets(json.data || []);
    } catch {
      showToast.error("Failed to load support tickets.");
    }
    setTicketsLoaded(true);
  };

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (tab === "support") loadTickets();
  };

  const handleNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/support/tickets`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issueType: "other",
            message: supportMessage,
          }),
        },
      );
      const json = await res.json();
      if (json.success) {
        showToast.success("Support ticket created.");
        setSupportMessage("");
        setTickets((prev) => [json.data, ...prev]);
        setActiveTicket(json.data);
        setTicketMessages([
          {
            id: "1",
            senderRole: "customer",
            body: supportMessage,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        showToast.error("Failed to create ticket.");
      }
    } catch {
      showToast.error("Network error.");
    }
    setSupportLoading(false);
  };

  const handleOpenTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/support/tickets/${ticket.id}`,
        { credentials: "include" },
      );
      const json = await res.json();
      if (json.success) {
        setTicketMessages(json.data.messages || []);
      }
    } catch {
      showToast.error("Failed to load messages.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTicket) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/support/tickets/${activeTicket.id}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: newMessage }),
        },
      );
      const json = await res.json();
      if (json.success) {
        setTicketMessages((prev) => [...prev, json.data]);
        setNewMessage("");
      }
    } catch {
      showToast.error("Failed to send message.");
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--surface)] pt-8 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-[#101744] dark:text-[#e8eaf0] font-extrabold 
                           text-2xl tracking-[-0.04em]"
            >
              Settings
            </h1>
            <div className="h-[3px] w-10 bg-[#92fc40] mt-1" />
          </div>

          {/* Tab bar */}
          <div
            className="flex gap-1 mb-8 bg-[#edeeef] dark:bg-[#222536] 
                          p-1 rounded-xl"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex-1 py-2.5 rounded-lg text-sm font-bold transition-all
                  ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-[#1e2235] text-[#101744] dark:text-[#e8eaf0] shadow-sm"
                      : "text-[#5e5e5e] dark:text-[#9ba3b8] hover:text-[#101744] dark:hover:text-[#e8eaf0]"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ACCOUNT TAB */}
          {activeTab === "account" && (
            <div className="space-y-4">
              {/* User info card */}
              <div
                className="bg-white dark:bg-[#1e2235] rounded-2xl 
                              shadow-[0_12px_24px_rgba(0,4,53,0.08)] p-6"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-full bg-[#101744] flex items-center 
                                  justify-center text-white font-bold text-xl flex-shrink-0"
                  >
                    {user?.displayName?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="text-[#101744] dark:text-[#e8eaf0] font-bold text-base">
                      {user?.displayName}
                    </p>
                    <p className="text-[#5e5e5e] dark:text-[#9ba3b8] text-sm">
                      {user?.email}
                    </p>
                    {user?.username && (
                      <p className="text-[#92fc40] text-sm font-bold">
                        @{user.username}
                      </p>
                    )}
                  </div>
                </div>

                {/* Username form */}
                <form onSubmit={handleUsernameSubmit} className="space-y-3">
                  <label
                    className="block text-[0.6875rem] font-bold uppercase 
                                    tracking-[0.05em] text-[#46464f] dark:text-[#9ba3b8]"
                  >
                    Username
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#5e5e5e] font-bold">@</span>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) =>
                        setNewUsername(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "")
                            .slice(0, 30),
                        )
                      }
                      placeholder="your_username"
                      maxLength={30}
                      className="flex-1 h-11 px-4 rounded-xl 
                                 bg-[#f3f4f5] dark:bg-[#222536]
                                 text-[#191c1d] dark:text-[#e8eaf0]
                                 text-sm focus:outline-none 
                                 focus:bg-[#edeeef] dark:focus:bg-[#272a3d]
                                 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={usernameLoading}
                    className="h-10 px-6 rounded-full bg-[#92fc40] text-[#0b2000] 
                               font-bold text-sm hover:bg-[#77df1e] transition-colors 
                               disabled:opacity-50"
                  >
                    {usernameLoading ? "Saving..." : "Save Username"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <div className="space-y-4">
              {/* Dark mode */}
              <div
                className="bg-white dark:bg-[#1e2235] rounded-2xl 
                              shadow-[0_12px_24px_rgba(0,4,53,0.08)] p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#101744] dark:text-[#e8eaf0] font-bold text-base mb-1">
                      Appearance
                    </p>
                    <p className="text-[#5e5e5e] dark:text-[#9ba3b8] text-sm">
                      {theme === "dark"
                        ? "Dark mode is on"
                        : "Light mode is on"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className={`
                      relative w-14 h-7 rounded-full transition-colors duration-200
                      ${theme === "dark" ? "bg-[#92fc40]" : "bg-[#edeeef] dark:bg-[#222536]"}
                    `}
                  >
                    <div
                      className={`
                      absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm
                      transition-transform duration-200
                      ${theme === "dark" ? "translate-x-8" : "translate-x-1"}
                    `}
                    />
                  </button>
                </div>
              </div>

              {/* Language */}
              <div
                className="bg-white dark:bg-[#1e2235] rounded-2xl 
                              shadow-[0_12px_24px_rgba(0,4,53,0.08)] p-6"
              >
                <p className="text-[#101744] dark:text-[#e8eaf0] font-bold text-base mb-4">
                  Language
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {["en", "tr"].map((lang) => (
                    <a
                      key={lang}
                      href={`/${lang}/settings`}
                      className={`
                        h-11 rounded-xl flex items-center justify-center
                        font-bold text-sm transition-all
                        ${
                          locale === lang
                            ? "bg-[#101744] text-white"
                            : "bg-[#f3f4f5] dark:bg-[#222536] text-[#5e5e5e] dark:text-[#9ba3b8]"
                        }
                      `}
                    >
                      {lang === "en" ? "English" : "Türkçe"}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUPPORT TAB */}
          {activeTab === "support" && (
            <div className="space-y-4">
              {/* Active ticket chat view */}
              {activeTicket ? (
                <div
                  className="bg-white dark:bg-[#1e2235] rounded-2xl 
                                shadow-[0_12px_24px_rgba(0,4,53,0.08)] overflow-hidden"
                >
                  {/* Chat header */}
                  <div
                    className="p-4 border-b border-[rgba(0,4,53,0.06)] 
                                  dark:border-[rgba(255,255,255,0.06)]
                                  flex items-center gap-3"
                  >
                    <button
                      onClick={() => setActiveTicket(null)}
                      className="w-8 h-8 rounded-full bg-[#f3f4f5] dark:bg-[#222536]
                                 flex items-center justify-center"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M10 12L6 8L10 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <div>
                      <p className="text-[#101744] dark:text-[#e8eaf0] font-bold text-sm">
                        Support Chat
                      </p>
                      <p className="text-[#5e5e5e] dark:text-[#9ba3b8] text-xs capitalize">
                        {activeTicket.status}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto">
                    {ticketMessages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.senderRole === "customer"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`
                          max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                          ${
                            msg.senderRole === "customer"
                              ? "bg-[#101744] text-white rounded-br-sm"
                              : "bg-[#f3f4f5] dark:bg-[#222536] text-[#191c1d] dark:text-[#e8eaf0] rounded-bl-sm"
                          }
                        `}
                        >
                          {msg.body}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message input */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-4 border-t border-[rgba(0,4,53,0.06)]
                               dark:border-[rgba(255,255,255,0.06)] flex gap-2"
                  >
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) =>
                        setNewMessage(
                          e.target.value.replace(/[<>'"`;]/g, "").slice(0, 500),
                        )
                      }
                      placeholder="Type a message..."
                      maxLength={500}
                      className="flex-1 h-10 px-4 rounded-full 
                                 bg-[#f3f4f5] dark:bg-[#222536]
                                 text-[#191c1d] dark:text-[#e8eaf0]
                                 text-sm focus:outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-10 h-10 rounded-full bg-[#92fc40] 
                                 flex items-center justify-center
                                 disabled:opacity-40 transition-opacity"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path d="M2 8L14 2L8 14L7 9L2 8Z" fill="#0b2000" />
                      </svg>
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* New ticket form */}
                  <div
                    className="bg-white dark:bg-[#1e2235] rounded-2xl 
                                  shadow-[0_12px_24px_rgba(0,4,53,0.08)] p-6"
                  >
                    <p className="text-[#101744] dark:text-[#e8eaf0] font-bold text-base mb-1">
                      Start a conversation
                    </p>
                    <p className="text-[#5e5e5e] dark:text-[#9ba3b8] text-sm mb-4">
                      Describe your issue and our team will respond shortly.
                    </p>
                    <form onSubmit={handleNewTicket} className="space-y-3">
                      <textarea
                        value={supportMessage}
                        onChange={(e) =>
                          setSupportMessage(
                            e.target.value
                              .replace(/[<>'"`;]/g, "")
                              .slice(0, 1000),
                          )
                        }
                        placeholder="What can we help you with?"
                        maxLength={1000}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl resize-none
                                   bg-[#f3f4f5] dark:bg-[#222536]
                                   text-[#191c1d] dark:text-[#e8eaf0]
                                   text-sm focus:outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={supportLoading || !supportMessage.trim()}
                        className="h-11 px-6 rounded-full bg-[#92fc40] text-[#0b2000]
                                   font-bold text-sm hover:bg-[#77df1e] transition-colors
                                   disabled:opacity-50"
                      >
                        {supportLoading ? "Sending..." : "Send Message"}
                      </button>
                    </form>
                  </div>

                  {/* Previous tickets */}
                  {tickets.length > 0 && (
                    <div
                      className="bg-white dark:bg-[#1e2235] rounded-2xl 
                                    shadow-[0_12px_24px_rgba(0,4,53,0.08)] p-6"
                    >
                      <p
                        className="text-[#101744] dark:text-[#e8eaf0] font-bold 
                                    text-base mb-4"
                      >
                        Previous conversations
                      </p>
                      <div className="space-y-3">
                        {tickets.map((ticket: any) => (
                          <button
                            key={ticket.id}
                            onClick={() => handleOpenTicket(ticket)}
                            className="w-full text-left p-4 rounded-xl
                                       bg-[#f3f4f5] dark:bg-[#222536]
                                       hover:bg-[#edeeef] dark:hover:bg-[#272a3d]
                                       transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <p
                                className="text-[#101744] dark:text-[#e8eaf0] 
                                            font-bold text-sm capitalize"
                              >
                                {ticket.issue_type?.replace("_", " ") ||
                                  "General"}
                              </p>
                              <span
                                className={`
                                text-[0.6875rem] font-bold uppercase tracking-[0.05em]
                                px-2 py-0.5 rounded-full
                                ${
                                  ticket.status === "resolved"
                                    ? "bg-[#92fc40]/20 text-[#0b2000] dark:text-[#92fc40]"
                                    : "bg-[#f59e0b]/20 text-[#92400e]"
                                }
                              `}
                              >
                                {ticket.status}
                              </span>
                            </div>
                            <p
                              className="text-[#5e5e5e] dark:text-[#9ba3b8] 
                                          text-xs mt-1"
                            >
                              {new Date(ticket.created_at).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
