"use client";

import { useState, useEffect } from "react";
import { TicketStats, KpiStats } from "@/shared/types";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getTicketStats, getKpiStats } from "@/lib/api";

export default function DashboardPage() {
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [kpiStats, setKpiStats] = useState<KpiStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTicketStats(), getKpiStats()]).then(([ts, ks]) => {
      setTicketStats(ts);
      setKpiStats(ks);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>;

  return (
    <div>
      <PageHeader title="대시보드" description="IT Help Desk 운영 현황" />

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">1차 AI 해결률</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{kpiStats ? `${(kpiStats.resolutionRate * 100).toFixed(1)}%` : "-"}</p>
            <p className="text-xs text-gray-400 mt-1">목표: 70%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">2차 분배 성공률</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{kpiStats ? `${(kpiStats.routingAccuracy * 100).toFixed(1)}%` : "-"}</p>
            <p className="text-xs text-gray-400 mt-1">목표: 90%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">평균 처리 시간</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{kpiStats ? `${kpiStats.avgProcessingTimeHours.toFixed(1)}h` : "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* 티켓 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent><p className="text-sm text-gray-500">전체</p><p className="text-2xl font-bold">{ticketStats?.total || 0}</p></CardContent></Card>
        <Card className="border-blue-200"><CardContent><p className="text-sm text-blue-600">접수</p><p className="text-2xl font-bold text-blue-600">{ticketStats?.open || 0}</p></CardContent></Card>
        <Card className="border-yellow-200"><CardContent><p className="text-sm text-yellow-600">진행중</p><p className="text-2xl font-bold text-yellow-600">{ticketStats?.inProgress || 0}</p></CardContent></Card>
        <Card className="border-green-200"><CardContent><p className="text-sm text-green-600">해결</p><p className="text-2xl font-bold text-green-600">{ticketStats?.resolved || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold">최근 접수 티켓</h2></CardHeader>
        <CardContent><p className="text-gray-500 text-sm">실제 API 연동 후 최근 티켓이 여기에 표시됩니다.</p></CardContent>
      </Card>
    </div>
  );
}
