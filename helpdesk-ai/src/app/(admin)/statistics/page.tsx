"use client";

import { useState, useEffect } from "react";
import { LlmCostStats } from "@/shared/types";
import { Card, CardContent, CardHeader, SkeletonCard } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getLlmCostStats } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { DollarSign, Cpu, TrendingUp } from "lucide-react";

const PERIOD_LABELS = {
  day:   "일별 (최근 24시간)",
  week:  "주별 (최근 7일)",
  month: "월별 (이번 달)",
} as const;
const BAR_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];

export default function StatisticsPage() {
  const [llmStats, setLlmStats] = useState<LlmCostStats | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLlmCostStats(period).then((data) => { setLlmStats(data); setLoading(false); });
  }, [period]);

  const maxCost = Math.max(...(llmStats?.byPeriod.map((d) => d.cost) ?? [1]));

  return (
    <div className="animate-fade-in">
      <PageHeader title="통계" description="LLM 비용 및 운영 통계" />

      {/* Period Filter */}
      <div className="flex gap-2 mb-6">
        {(["day", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`
              px-3.5 py-1.5 rounded-full text-sm font-medium transition-all
              ${period === p
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              }
            `}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Total Cost */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">총 LLM 비용</p>
                  <p className="text-4xl font-bold text-gray-900">
                    ${llmStats?.totalCost.toFixed(4) || "0.0000"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">선택 기간 기준</p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <DollarSign size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Cost */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-800">모델별 비용</h2>
              </div>
            </CardHeader>
            <CardContent>
              {llmStats?.byModel && llmStats.byModel.length > 0 ? (
                <div className="space-y-3">
                  {llmStats.byModel.map((item, i) => {
                    const pct = llmStats.totalCost > 0 ? (item.cost / llmStats.totalCost) * 100 : 0;
                    return (
                      <div key={item.model}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium truncate max-w-[60%]">{item.model}</span>
                          <div className="flex items-center gap-3 text-gray-500">
                            <span>{item.calls.toLocaleString()}회</span>
                            <span className="font-semibold text-gray-900">${item.cost.toFixed(4)}</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: BAR_COLORS[i % BAR_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* Cost Trend Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-800">비용 추이</h2>
              </div>
            </CardHeader>
            <CardContent>
              {llmStats?.byPeriod && llmStats.byPeriod.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={llmStats.byPeriod} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                      formatter={(v: number) => [`$${v.toFixed(4)}`, "비용"]}
                    />
                    <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                      {llmStats.byPeriod.map((_, i) => (
                        <Cell key={i} fill={i === llmStats.byPeriod.length - 1 ? "#6366f1" : "#c7d2fe"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">비용 추이 데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
