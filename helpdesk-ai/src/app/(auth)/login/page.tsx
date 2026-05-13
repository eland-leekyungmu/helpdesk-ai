"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { login } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const role = result.user.role;
    switch (role) {
      case "admin": window.location.href = "/dashboard"; break;
      case "agent_l1": window.location.href = "/queue"; break;
      case "agent_l2": window.location.href = "/tickets"; break;
      default: window.location.href = "/new-ticket";
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
            <Input label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required autoComplete="email" />
            <Input label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>로그인</Button>
          </form>
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-500 font-medium mb-2">테스트 계정 (비밀번호: 아무거나 4자 이상)</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li><code>kim@company.com</code> → 임직원</li>
              <li><code>park@company.com</code> → 1차 처리자</li>
              <li><code>lee@company.com</code> → 2차 처리자</li>
              <li><code>choi@company.com</code> → 관리자</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
