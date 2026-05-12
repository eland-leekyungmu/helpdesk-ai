"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }

      // 로그인 성공 시 역할에 따라 리다이렉트
      const data = await res.json();
      const role = data.user?.role;

      switch (role) {
        case "admin":
          window.location.href = "/dashboard";
          break;
        case "agent_l1":
          window.location.href = "/queue";
          break;
        case "agent_l2":
          window.location.href = "/tickets";
          break;
        default:
          window.location.href = "/new-ticket";
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-bold text-center text-gray-900">IT Help Desk</h1>
          <p className="text-sm text-center text-gray-500 mt-1">로그인하여 시작하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              autoComplete="email"
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}
            <Button type="submit" className="w-full" loading={loading}>
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
