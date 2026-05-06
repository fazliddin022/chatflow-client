"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MessageSquare, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
      } else {
        if (!form.name.trim()) {
          setError("Please enter your name.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name } },
        });
        if (error) throw error;
      }
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const INPUT_STYLE: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem 0.75rem 2.75rem",
    border: "1px solid #1e293b",
    borderRadius: "0.75rem",
    fontSize: "0.875rem",
    outline: "none",
    background: "#1e293b",
    color: "#f1f5f9",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "60px",
            height: "60px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <MessageSquare size={28} color="white" />
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9" }}>
            ChatFlow
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {isLogin ? "Welcome back!" : "Create your account"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#1e293b",
          borderRadius: "1.5rem",
          padding: "2rem",
          border: "1px solid #334155",
        }}>
          {/* Tabs */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#0f172a",
            borderRadius: "0.75rem",
            padding: "0.25rem",
            marginBottom: "1.5rem",
          }}>
            {["Login", "Sign Up"].map((tab) => (
              <button
                key={tab}
                onClick={() => { setIsLogin(tab === "Login"); setError(""); }}
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.625rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  transition: "all 0.2s",
                  background: (isLogin && tab === "Login") || (!isLogin && tab === "Sign Up")
                    ? "#6366f1"
                    : "transparent",
                  color: (isLogin && tab === "Login") || (!isLogin && tab === "Sign Up")
                    ? "white"
                    : "#64748b",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Name — faqat Sign Up */}
            {!isLogin && (
              <div style={{ position: "relative" }}>
                <User size={16} style={{
                  position: "absolute",
                  left: "0.875rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#475569",
                }} />
                <input
                  name="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  style={INPUT_STYLE}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{
                position: "absolute",
                left: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#475569",
              }} />
              <input
                name="email"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                style={INPUT_STYLE}
              />
            </div>

            {/* Password */}
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{
                position: "absolute",
                left: "0.875rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#475569",
              }} />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                style={{ ...INPUT_STYLE, paddingRight: "3rem" }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "0.875rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "#450a0a",
                border: "1px solid #7f1d1d",
                borderRadius: "0.75rem",
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                color: "#fca5a5",
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: loading ? "#4338ca" : "#6366f1",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
                borderRadius: "0.75rem",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                marginTop: "0.5rem",
              }}
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </div>
        </div>

        <p style={{
          textAlign: "center",
          fontSize: "0.75rem",
          color: "#475569",
          marginTop: "1.5rem",
        }}>
          Powered by Socket.io + Supabase 🚀
        </p>
      </div>
    </div>
  );
}