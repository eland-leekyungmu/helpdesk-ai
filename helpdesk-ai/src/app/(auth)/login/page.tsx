"use client";

import { useState } from "react";
import { Button, Input, useToast } from "@/components/ui";
import { Headphones, Mail, Lock } from "lucide-react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);

    if ("error" in result) {
      showError(result.error || "로그인에 실패했습니다.");
      setLoading(false);
      return;
    }

    const role = result.user?.role;
    switch (role) {
      case "admin":    window.location.href = "/dashboard";  break;
      case "agent_l1": window.location.href = "/queue";      break;
      case "agent_l2": window.location.href = "/tickets";    break;
      default:         window.location.href = "/new-ticket"; break;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-sm">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Headphones size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">IT Help Desk</h1>
          <p className="text-white/70 text-base leading-relaxed">
            AI 기반 IT 헬프데스크 시스템으로<br />
            빠르고 정확한 IT 지원을 받으세요.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { label: "AI 자동 해결", value: "70%+" },
              { label: "평균 응답", value: "< 1h" },
              { label: "만족도", value: "4.8★" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-white/60 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f8f9fc]">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center">
              <Headphones size={20} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">IT Help Desk</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-[0_4px_24px_0_rgb(0,0,0,0.08)] p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">로그인</h2>
              <p className="text-sm text-gray-500 mt-1">계정 정보를 입력해주세요</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="이메일"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                autoComplete="email"
                leftIcon={<Mail size={16} />}
              />
              <Input
                label="비밀번호"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                leftIcon={<Lock size={16} />}
              />
              <Button type="submit" className="w-full mt-2" loading={loading} size="lg">
                로그인
              </Button>
            </form>

            {/* Test accounts */}
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
              <p className="text-xs font-semibold text-gray-500 mb-2">테스트 계정 (비밀번호: 4자 이상)</p>
              <div className="space-y-1">
                {[
                  { email: "kim@company.com",  role: "임직원" },
                  { email: "park@company.com", role: "1차 처리자" },
                  { email: "lee@company.com",  role: "2차 처리자" },
                  { email: "choi@company.com", role: "관리자" },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setTimeout(() => {
                        const input = document.querySelector('input[type="email"]') as HTMLInputElement;
                        if (input) input.focus();
                      }, 50);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors group"
                  >
                    <code className="text-xs text-gray-600 group-hover:text-indigo-600">{acc.email}</code>
                    <span className="text-xs text-gray-400 group-hover:text-indigo-400">{acc.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
