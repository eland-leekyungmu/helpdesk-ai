"use client";

import { useState, useEffect } from "react";
import { LlmCostStats } from "@/shared/types";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout";

export default function StatisticsPage() {
  const [llmStats, setLlmStats] = useState<LlmCostStats | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/llm-cost?period=${period}`);
      const data = await res.json();
      if (data.success) setLlmStats(data.data);
    } catch {
      // 에러 처리
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="통계" description="LLM 비용 및 운영 통계" />

      {/* 기간 필터 */}
      <div className="flex gap-2 mb-6">
        {(["day", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              period === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {p === "day" && "일별"}
            {p === "week" && "주별"}
            {p === "month" && "월별"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>
      ) : (
        <div className="space-y-6">
          {/* 총 비용 */}
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">총 LLM 비용</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                ${llmStats?.totalCost.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>

          {/* 모델별 비용 */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">모델별 비용</h2>
            </CardHeader>
            <CardContent>
              {llmStats?.byModel && llmStats.byModel.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium text-gray-500">모델</th>
                        <th className="text-right py-2 font-medium text-gray-500">호출 수</th>
                        <th className="text-right py-2 font-medium text-gray-500">비용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {llmStats.byModel.map((item) => (
                        <tr key={item.model} className="border-b last:border-0">
                          <td className="py-2">{item.model}</td>
                          <td className="py-2 text-right">{item.calls.toLocaleString()}</td>
                          <td className="py-2 text-right font-medium">${item.cost.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 기간별 비용 추이 */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">비용 추이</h2>
            </CardHeader>
            <CardContent>
              {llmStats?.byPeriod && llmStats.byPeriod.length > 0 ? (
                <div className="space-y-2">
                  {llmStats.byPeriod.map((item) => (
                    <div key={item.date} className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-24">{item.date}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4">
                        <div
                          className="bg-blue-500 rounded-full h-4"
                          style={{ width: `${Math.min((item.cost / (llmStats.totalCost || 1)) * 100 * llmStats.byPeriod.length, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-20 text-right">${item.cost.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">데이터가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
