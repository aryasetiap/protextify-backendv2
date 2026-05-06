import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private getRangeDays(range: '7d' | '30d' | '90d' = '30d') {
    if (range === '7d') return 7;
    if (range === '90d') return 90;
    return 30;
  }

  private getDateSlots(days: number) {
    const now = new Date();
    const slots: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      slots.push(d.toISOString().split('T')[0]);
    }
    return slots;
  }

  async getDashboardOverview() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      totalClasses,
      totalAssignments,
      totalSubmissions,
      totalTransactions,
      successfulTransactions,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      this.prisma.class.count(),
      this.prisma.assignment.count(),
      this.prisma.submission.count(),
      this.prisma.transaction.count(),
      this.prisma.transaction.findMany({
        where: { status: 'SUCCESS' },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    const totalRevenue = successfulTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );
    const monthlyRevenue = successfulTransactions
      .filter((tx) => tx.createdAt >= thirtyDaysAgo)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      stats: {
        totalUsers,
        totalStudents,
        totalInstructors,
        totalClasses,
        totalAssignments,
        totalSubmissions,
        totalTransactions,
        totalRevenue,
        monthlyRevenue,
      },
      recentUsers,
    };
  }

  async getDashboardCharts(range: '7d' | '30d' | '90d' = '30d') {
    const days = this.getRangeDays(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const [users, submissions, transactions, roleCounts] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      }),
      this.prisma.submission.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true, status: true },
      }),
      this.prisma.transaction.findMany({
        where: { createdAt: { gte: startDate }, status: 'SUCCESS' },
        select: { createdAt: true, amount: true },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
    ]);

    const daySlots = this.getDateSlots(days);
    const trendMap = new Map<
      string,
      {
        date: string;
        newUsers: number;
        submissions: number;
        gradedSubmissions: number;
        revenue: number;
      }
    >(
      daySlots.map((date) => [
        date,
        { date, newUsers: 0, submissions: 0, gradedSubmissions: 0, revenue: 0 },
      ]),
    );

    for (const user of users) {
      const key = user.createdAt.toISOString().split('T')[0];
      const slot = trendMap.get(key);
      if (slot) slot.newUsers += 1;
    }

    for (const submission of submissions) {
      const key = submission.createdAt.toISOString().split('T')[0];
      const slot = trendMap.get(key);
      if (slot) {
        slot.submissions += 1;
        if (submission.status === 'GRADED') {
          slot.gradedSubmissions += 1;
        }
      }
    }

    for (const tx of transactions) {
      const key = tx.createdAt.toISOString().split('T')[0];
      const slot = trendMap.get(key);
      if (slot) {
        slot.revenue += tx.amount;
      }
    }

    return {
      userRoleDistribution: roleCounts.map((item) => ({
        role: item.role,
        count: item._count.role,
      })),
      platformTrends: Array.from(trendMap.values()),
    };
  }
}
