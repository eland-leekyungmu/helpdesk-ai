"use client";

import { useState, useEffect } from "react";
import { LlmCostStats } from "@/shared/types";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getLlmCostStats } from "@/lib/api";

export default function StatisticsPage() {
  const [llmStats, setLlmStats] = useState<LlmCostStats | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLlmCostStats().then((data) => { setLlmStats(data); setLoading(false); });
  }, [period]);

  return (
    <div>
      <PageHeader title="통계" description="LLM 비용 및 운영 통계" />

      <div className="flex gap-2 mb-6">
        {(["day", "week", "month"] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            {p === "day" && "일별"}{p === "week" && "주별"}{p === "month" && "월별"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>
      ) : (
        <div className="space-y-6">
          <Card><CardContent><p className="text-sm text-gray-500">총 LLM 비용</p><p className="text-3xl font-bold text-gray-900 mt-1">${llmStats?.totalCost.toFixed(2) || "0.00"}</p></CardContent></Card>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold">모델별 비용</h2></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2 font-medium text-gray-500">모델</th><th className="text-right py-2 font-medium text-gray-500">호출 수</th><th className="text-right py-2 font-medium text-gray-500">비용</th></tr></thead>
                <tbody>
                  {llmStats?.byModel.map((item) => (
                    <tr key={item.model} className="border-b last:border-0"><td className="py-2">{item.model}</td><td className="py-2 text-right">{item.calls.toLocaleString()}</td><td className="py-2 text-right font-medium">${item.cost.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold">비용 추이</h2></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {llmStats?.byPeriod.map((item) => (
                  <div key={item.date} className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 w-24">{item.date}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4">
                      <div className="bg-blue-500 rounded-full h-4" style={{ width: `${(item.cost / 10) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">${item.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
