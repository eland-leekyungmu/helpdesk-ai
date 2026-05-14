import { prisma } from '@/lib/prisma';
import type {
  DateRange,
  RateMetric,
  CostStats,
  TicketStats,
  DepartmentStats,
} from '@/shared/types';

export class AnalyticsService {
  /**
   * 1차 해결률 (AI 자동 해결 / 전체 해결 건)
   */
  async getResolutionRate(period: DateRange): Promise<RateMetric> {
    const total = await prisma.ticket.count({
      where: {
        status: { in: ['resolved', 'closed'] },
        resolvedAt: { gte: period.from, lte: period.to },
      },
    });

    const aiResolved = await prisma.ticket.count({
      where: {
        status: { in: ['resolved', 'closed'] },
        resolutionType: 'ai_auto',
        resolvedAt: { gte: period.from, lte: period.to },
      },
    });

    return {
      total,
      matched: aiResolved,
      rate: total > 0 ? aiResolved / total : 0,
    };
  }

  /**
   * 분배 성공률 (active+completed / 전체 분배)
   */
  async getRoutingAccuracy(period: DateRange): Promise<RateMetric> {
    const total = await prisma.ticketAssignment.count({
      where: { createdAt: { gte: period.from, lte: period.to } },
    });

    const successful = await prisma.ticketAssignment.count({
      where: {
        createdAt: { gte: period.from, lte: period.to },
        status: { in: ['active', 'completed'] },
      },
    });

    return {
      total,
      matched: successful,
      rate: total > 0 ? successful / total : 0,
    };
  }

  /**
   * 처리 시간 통계 (분 단위)
   */
  async getProcessingTime(period: DateRange): Promise<{ avg: number; median: number; p95: number; unit: 'minutes' }> {
    const tickets = await prisma.ticket.findMany({
      where: {
        resolvedAt: { not: null, gte: period.from, lte: period.to },
      },
      select: { createdAt: true, resolvedAt: true },
    });

    if (tickets.length === 0) {
      return { avg: 0, median: 0, p95: 0, unit: 'minutes' };
    }

    const durations = tickets
      .map((t) => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 60000)
      .sort((a, b) => a - b);

    const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
    const median = durations[Math.floor(durations.length / 2)];
    const p95 = durations[Math.floor(durations.length * 0.95)];

    return { avg: Math.round(avg), median: Math.round(median), p95: Math.round(p95), unit: 'minutes' };
  }

  /**
   * LLM 비용 통계
   */
  async getLLMCostStats(
    period: DateRange,
    groupBy: 'model' | 'day' | 'week',
  ): Promise<CostStats> {
    const logs = await prisma.llmUsageLog.findMany({
      where: { createdAt: { gte: period.from, lte: period.to } },
      select: { modelName: true, costUsd: true, createdAt: true },
    });

    const totalCost = logs.reduce((s, l) => s + Number(l.costUsd), 0);

    const grouped = new Map<string, { cost: number; count: number }>();

    for (const log of logs) {
      let key: string;
      if (groupBy === 'model') {
        key = log.modelName;
      } else if (groupBy === 'day') {
        key = log.createdAt.toISOString().slice(0, 10);
      } else {
        // week: ISO week
        const d = log.createdAt;
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      }

      const entry = grouped.get(key) || { cost: 0, count: 0 };
      entry.cost += Number(log.costUsd);
      entry.count += 1;
      grouped.set(key, entry);
    }

    const breakdown = Array.from(grouped.entries()).map(([label, v]) => ({
      label,
      cost: Math.round(v.cost * 1000000) / 1000000,
      count: v.count,
    }));

    return { totalCost: Math.round(totalCost * 1000000) / 1000000, breakdown };
  }

  /**
   * 티켓 통계
   */
  async getTicketStats(period: DateRange): Promise<TicketStats> {
    const tickets = await prisma.ticket.findMany({
      where: { createdAt: { gte: period.from, lte: period.to } },
      select: { status: true, resolutionType: true },
    });

    const byStatus: Record<string, number> = {};
    const byResolutionType: Record<string, number> = {};

    for (const t of tickets) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.resolutionType) {
        byResolutionType[t.resolutionType] = (byResolutionType[t.resolutionType] || 0) + 1;
      }
    }

    return { total: tickets.length, byStatus, byResolutionType };
  }

  /**
   * 부서별 통계
   */
  async getDepartmentStats(period: DateRange): Promise<DepartmentStats[]> {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        teams: {
          include: {
            users: {
              select: { id: true },
            },
          },
        },
      },
    });

    const results: DepartmentStats[] = [];

    for (const dept of departments) {
      const userIds = dept.teams.flatMap((t) => t.users.map((u) => u.id));
      if (userIds.length === 0) {
        results.push({
          departmentId: dept.id,
          departmentName: dept.name,
          ticketCount: 0,
          avgResolutionMinutes: 0,
        });
        continue;
      }

      const tickets = await prisma.ticket.findMany({
        where: {
          requesterId: { in: userIds },
          createdAt: { gte: period.from, lte: period.to },
        },
        select: { createdAt: true, resolvedAt: true },
      });

      const resolved = tickets.filter((t) => t.resolvedAt);
      const avgMin =
        resolved.length > 0
          ? resolved.reduce(
              (s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 60000,
              0,
            ) / resolved.length
          : 0;

      results.push({
        departmentId: dept.id,
        departmentName: dept.name,
        ticketCount: tickets.length,
        avgResolutionMinutes: Math.round(avgMin),
      });
    }

    return results;
  }
}

export const analyticsService = new AnalyticsService();
