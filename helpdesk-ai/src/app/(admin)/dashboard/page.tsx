"use client";

import { useState, useEffect, useCallback } from "react";
import { TicketStats, KpiStats } from "@/shared/types";
import { Card, CardContent, CardHeader, SkeletonCard } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getTicketStats, getKpiStats } from "@/lib/api";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Target, Zap, Clock, Ticket, RefreshCw, TrendingUp } from "lucide-react";

const KPI_CARDS = [
  {
    key: "resolutionRate",
    label: "AI 1차 해결률",
    target: "목표 70%",
    icon: <Zap size={20} />,
    color: "from-indigo-500 to-violet-500",
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    format: (v: number) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: "routingAccuracy",
    label: "2차 분배 성공률",
    target: "목표 90%",
    icon: <Target size={20} />,
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    format: (v: number) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: "avgProcessingTimeHours",
    label: "평균 처리 시간",
    target: "목표 < 4h",
    icon: <Clock size={20} />,
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    text: "text-amber-600",
    format: (v: number) => `${v.toFixed(1)}h`,
  },
] as const;

const TICKET_STATUS_COLORS = {
  open:        "#6366f1",
  in_progress: "#f59e0b",
  resolved:    "#10b981",
  closed:      "#9ca3af",
};

// 더미 트렌드 데이터 제거 — 실제 API 연동으로 교체

export default function DashboardPage() {
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [kpiStats, setKpiStats] = useState<KpiStats | null>(null);
  const [trendData, setTrendData] = useState<{ date: string; 접수: number; 해결: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = now.toISOString();
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const [ts, ks, trendRes] = await Promise.all([
      getTicketStats(),
      getKpiStats(),
      fetch(`/api/analytics?type=trend&from=${from}&to=${to}&days=7`, { headers })
        .then(r => r.json())
        .then(d => d.success ? d.data : [])
        .catch(() => []),
    ]);
    setTicketStats(ts);
    setKpiStats(ks);
    setTrendData(trendRes);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pieData = ticketStats
    ? [
        { name: "접수",   value: ticketStats.open || 0,        color: TICKET_STATUS_COLORS.open },
        { name: "진행중", value: ticketStats.inProgress || 0,  color: TICKET_STATUS_COLORS.in_progress },
        { name: "해결",   value: ticketStats.resolved || 0,    color: TICKET_STATUS_COLORS.resolved },
        { name: "종료",   value: ticketStats.closed || 0,      color: TICKET_STATUS_COLORS.closed },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="대시보드"
        description="IT Help Desk 운영 현황"
        actions={
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            새로고침
          </button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {KPI_CARDS.map((card) => {
              const value = kpiStats?.[card.key] ?? 0;
              return (
                <Card key={card.key}>
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                        <p className={`text-3xl font-bold ${card.text}`}>{card.format(value)}</p>
                        <p className="text-xs text-gray-400 mt-1">{card.target}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-2xl ${card.bg} flex items-center justify-center ${card.text}`}>
                        {card.icon}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Ticket Status + Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Ticket Status Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Ticket size={16} className="text-indigo-500" />
                  <h2 className="text-sm font-semibold text-gray-800">티켓 현황</h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={pieData.length > 0 ? pieData : [{ name: "없음", value: 1, color: "#e5e7eb" }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {(pieData.length > 0 ? pieData : [{ color: "#e5e7eb" }]).map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v}건`]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-2xl font-bold text-gray-900">{ticketStats?.total || 0}</p>
                      <p className="text-xs text-gray-400">전체</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "접수",   value: ticketStats?.open || 0,        color: "bg-indigo-500" },
                    { label: "진행중", value: ticketStats?.inProgress || 0,  color: "bg-amber-500" },
                    { label: "해결",   value: ticketStats?.resolved || 0,    color: "bg-emerald-500" },
                    { label: "종료",   value: ticketStats?.closed || 0,      color: "bg-gray-400" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.color}`} />
                        <span className="text-gray-600">{item.label}</span>
                      </div>
                      <span className="font-medium text-gray-900">{item.value}건</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trend Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-indigo-500" />
                  <h2 className="text-sm font-semibold text-gray-800">최근 7일 티켓 추이</h2>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                      formatter={(v, name) => [`${v}건`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Area type="monotone" dataKey="접수" stroke="#6366f1" strokeWidth={2} fill="url(#colorAccepted)" dot={false} />
                    <Area type="monotone" dataKey="해결" stroke="#10b981" strokeWidth={2} fill="url(#colorResolved)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
