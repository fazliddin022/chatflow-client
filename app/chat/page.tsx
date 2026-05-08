"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket";
import { Room, Message, User } from "@/types";
import {
  MessageSquare,
  Send,
  LogOut,
  Hash,
  Users,
  Wifi,
  WifiOff,
  Pencil,
  Trash2,
  Check,
  X,
  Menu,
} from "lucide-react";
import { useWindowSize } from "@/hooks/useWindowSize";


export default function ChatPage() {
  const router = useRouter();
  const { isMobile } = useWindowSize();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typing, setTyping] = useState("");
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser }, error }) => {
      if (error || !authUser) {
        supabase.auth.signOut();
        router.push("/");
        return;
      }

      const userData: User = {
        id: authUser.id,
        email: authUser.email || "",
        name: authUser.user_metadata?.full_name ||
              authUser.email?.split("@")[0] || "User",
      };

      setUser(userData);
      socket.connect();

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("user:online", authUser.id);
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("users:online", (users: string[]) => {
        setOnlineUsers(users);
      });

      socket.on("message:receive", (message: Message) => {
        setMessages((prev) => [...prev, message]);
      });

      socket.on("message:edited", (updated: Message) => {
        setMessages((prev) =>
          prev.map((m) => m.id === updated.id ? updated : m)
        );
      });

      socket.on("message:deleted", (messageId: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      });

      socket.on("typing:show", (name: string) => {
        setTyping(`${name} is typing...`);
      });

      socket.on("typing:hide", () => setTyping(""));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("users:online");
      socket.off("message:receive");
      socket.off("message:edited");
      socket.off("message:deleted");
      socket.off("typing:show");
      socket.off("typing:hide");
      socket.disconnect();
    };
  }, [router]);

  useEffect(() => {
    supabase
      .from("rooms")
      .select("*")
      .order("created_at")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setRooms(data);
          setActiveRoom(data[0]);
        }
      });
  }, []);

  useEffect(() => {
    if (!activeRoom || !connected) return;
    socket.emit("room:join", activeRoom.id);
    supabase
      .from("messages")
      .select("*")
      .eq("room_id", activeRoom.id)
      .order("created_at")
      .then(({ data }) => setMessages(data || []));
  }, [activeRoom, connected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleRoomChange = (room: Room) => {
    if (activeRoom) socket.emit("room:leave", activeRoom.id);
    setActiveRoom(room);
    setMessages([]);
    setTyping("");
    setEditingId(null);
    setSidebarOpen(false);
  };

  const handleSend = () => {
    if (!input.trim() || !user || !activeRoom) return;
    socket.emit("message:send", {
      roomId: activeRoom.id,
      senderId: user.id,
      content: input.trim(),
      senderName: user.name,
    });
    setInput("");
    socket.emit("typing:stop", { roomId: activeRoom.id });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!activeRoom || !user) return;
    socket.emit("typing:start", { roomId: activeRoom.id, userName: user.name });
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(
      setTimeout(() => {
        socket.emit("typing:stop", { roomId: activeRoom.id });
      }, 1500)
    );
  };

  const handleEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleEditSave = (msg: Message) => {
    if (!editContent.trim() || !activeRoom) return;
    socket.emit("message:edit", {
      messageId: msg.id,
      content: editContent.trim(),
      roomId: activeRoom.id,
    });
    setEditingId(null);
    setEditContent("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleDelete = (messageId: string) => {
    if (!activeRoom) return;
    socket.emit("message:delete", {
      messageId,
      roomId: activeRoom.id,
    });
  };

  const handleSignOut = async () => {
    socket.disconnect();
    await supabase.auth.signOut();
    router.push("/");
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#64748b",
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#0f172a",
      overflow: "hidden",
    }}>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: "260px",
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        position: isMobile ? "fixed" : "relative",
        left: 0,
        top: 0,
        bottom: 0,
        height: isMobile ? "100vh" : "auto",
        zIndex: 50,
        transform: isMobile && !sidebarOpen ? "translateX(-260px)" : "translateX(0)",
        transition: "transform 0.3s ease",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: "1.25rem",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: "0.625rem",
              padding: "0.375rem",
              display: "flex",
            }}>
              <MessageSquare size={16} color="white" />
            </div>
            <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: "0.875rem" }}>
              ChatFlow
            </span>
          </div>
          {connected
            ? <Wifi size={14} color="#22c55e" />
            : <WifiOff size={14} color="#ef4444" />
          }
        </div>

        {/* Rooms */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
          <p style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "0.5rem 0.5rem 0.375rem",
          }}>
            Channels
          </p>

          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleRoomChange(room)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.5rem 0.625rem",
                borderRadius: "0.625rem",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                background: activeRoom?.id === room.id ? "#1e293b" : "transparent",
                color: activeRoom?.id === room.id ? "#f1f5f9" : "#64748b",
                marginBottom: "0.125rem",
                textAlign: "left",
              }}
            >
              <Hash size={16} />
              <span style={{
                fontSize: "0.875rem",
                fontWeight: activeRoom?.id === room.id ? 600 : 400,
              }}>
                {room.name}
              </span>
            </button>
          ))}

          <p style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "1rem 0.5rem 0.375rem",
          }}>
            Online — {onlineUsers.length}
          </p>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.375rem 0.625rem",
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              {user.name}
            </span>
          </div>
        </div>

        {/* User footer */}
        <div style={{
          padding: "0.875rem",
          borderTop: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ color: "white", fontSize: "0.75rem", fontWeight: 700 }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f1f5f9" }}>
                {user.name}
              </p>
              <p style={{ fontSize: "0.7rem", color: "#475569" }}>Online</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#475569",
              display: "flex",
              padding: "0.25rem",
              borderRadius: "0.5rem",
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main chat */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        marginLeft: isMobile ? 0 : 0,
      }}>
        {/* Header */}
        <header style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0f172a",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  display: "flex",
                  padding: "0.25rem",
                  marginRight: "0.25rem",
                }}
              >
                <Menu size={20} />
              </button>
            )}
            <Hash size={18} color="#6366f1" />
            <span style={{ fontWeight: 600, color: "#f1f5f9" }}>
              {activeRoom?.name || "Select a room"}
            </span>
            {activeRoom?.description && !isMobile && (
              <span style={{
                fontSize: "0.75rem",
                color: "#475569",
                borderLeft: "1px solid #1e293b",
                paddingLeft: "0.625rem",
              }}>
                {activeRoom.description}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#475569" }}>
            <Users size={16} />
            <span style={{ fontSize: "0.75rem" }}>{onlineUsers.length} online</span>
          </div>
        </header>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: isMobile ? "1rem" : "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}>
          {messages.length === 0 ? (
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              gap: "0.75rem",
            }}>
              <Hash size={40} color="#1e293b" />
              <p style={{ fontSize: "0.875rem" }}>No messages yet. Say hello! 👋</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isOwn = msg.sender_id === user.id;
              const showName = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
              const isEditing = editingId === msg.id;
              const isHovered = hoveredId === msg.id;

              return (
                <div
                  key={msg.id}
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isOwn ? "flex-end" : "flex-start",
                    marginTop: showName ? "0.75rem" : "0.125rem",
                    position: "relative",
                  }}
                >
                  {showName && !isOwn && (
                    <span style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#6366f1",
                      marginBottom: "0.25rem",
                      paddingLeft: "0.25rem",
                    }}>
                      {msg.sender_name}
                    </span>
                  )}

                  <div style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "0.5rem",
                    flexDirection: isOwn ? "row-reverse" : "row",
                  }}>
                    {/* Edit/Delete — faqat o'z xabarida, hover'da */}
                    {isOwn && (isHovered || isMobile) && !isEditing && (
                      <div style={{
                        display: "flex",
                        gap: "0.25rem",
                        alignItems: "center",
                      }}>
                        <button
                          onClick={() => handleEdit(msg)}
                          style={{
                            background: "#1e293b",
                            border: "none",
                            borderRadius: "0.5rem",
                            padding: "0.375rem",
                            cursor: "pointer",
                            display: "flex",
                            color: "#94a3b8",
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          style={{
                            background: "#1e293b",
                            border: "none",
                            borderRadius: "0.5rem",
                            padding: "0.375rem",
                            cursor: "pointer",
                            display: "flex",
                            color: "#ef4444",
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div style={{ maxWidth: isMobile ? "280px" : "420px" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditSave(msg);
                              if (e.key === "Escape") handleEditCancel();
                            }}
                            autoFocus
                            style={{
                              padding: "0.5rem 0.75rem",
                              borderRadius: "0.75rem",
                              border: "1px solid #6366f1",
                              background: "#1e293b",
                              color: "#f1f5f9",
                              fontSize: "0.875rem",
                              outline: "none",
                              minWidth: isMobile ? "160px" : "200px",
                            }}
                          />
                          <button
                            onClick={() => handleEditSave(msg)}
                            style={{
                              background: "#6366f1",
                              border: "none",
                              borderRadius: "0.5rem",
                              padding: "0.375rem",
                              cursor: "pointer",
                              display: "flex",
                              color: "white",
                            }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={handleEditCancel}
                            style={{
                              background: "#1e293b",
                              border: "none",
                              borderRadius: "0.5rem",
                              padding: "0.375rem",
                              cursor: "pointer",
                              display: "flex",
                              color: "#94a3b8",
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          padding: "0.625rem 0.875rem",
                          borderRadius: isOwn
                            ? "1rem 1rem 0.25rem 1rem"
                            : "1rem 1rem 1rem 0.25rem",
                          background: isOwn ? "#6366f1" : "#1e293b",
                          color: isOwn ? "white" : "#e2e8f0",
                          fontSize: "0.875rem",
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}>
                          {msg.content}
                          {msg.is_edited && (
                            <span style={{
                              fontSize: "0.65rem",
                              opacity: 0.6,
                              marginLeft: "0.375rem",
                              fontStyle: "italic",
                            }}>
                              (edited)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <span style={{
                      fontSize: "0.65rem",
                      color: "#475569",
                      flexShrink: 0,
                      marginBottom: "0.125rem",
                    }}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {typing && (
            <div style={{
              fontSize: "0.75rem",
              color: "#6366f1",
              padding: "0.25rem 0",
              fontStyle: "italic",
            }}>
              {typing}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: isMobile ? "0.75rem 1rem" : "1rem 1.5rem",
          borderTop: "1px solid #1e293b",
          background: "#0f172a",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            background: "#1e293b",
            borderRadius: "0.875rem",
            padding: "0.5rem 0.5rem 0.5rem 1rem",
            border: "1px solid #334155",
          }}>
            <input
              value={input}
              onChange={handleTyping}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={`Message #${activeRoom?.name || "general"}`}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "#f1f5f9",
                fontSize: "0.875rem",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                background: input.trim() ? "#6366f1" : "#1e293b",
                border: "none",
                borderRadius: "0.625rem",
                padding: "0.5rem",
                cursor: input.trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              <Send size={18} color={input.trim() ? "white" : "#475569"} />
            </button>
          </div>
          {!isMobile && (
            <p style={{
              fontSize: "0.7rem",
              color: "#334155",
              marginTop: "0.5rem",
              textAlign: "center",
            }}>
              Press Enter to send · Hover message to edit or delete
            </p>
          )}
        </div>
      </div>
    </div>
  );
}