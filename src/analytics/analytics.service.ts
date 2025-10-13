import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Menentukan rentang tanggal berdasarkan parameter query.
   * @param range - String '7d', '30d', atau '90d'.
   * @returns Objek berisi tanggal mulai untuk periode saat ini dan sebelumnya.
   */
  private getDateRange(range: string): {
    startDate: Date;
    previousStartDate: Date;
    days: number;
  } {
    const now = new Date();
    let days;
    switch (range) {
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
      case '7d':
      default:
        days = 7;
        break;
    }
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(
      startDate.getTime() - days * 24 * 60 * 60 * 1000,
    );
    return { startDate, previousStartDate, days };
  }

  /**
   * Logika utama untuk mengambil dan memproses data analitik.
   */
  async getInstructorAnalytics(instructorId: string, range: string = '7d') {
    const { startDate, previousStartDate } = this.getDateRange(range);

    const instructorClasses = await this.prisma.class.findMany({
      where: { instructorId },
      select: { id: true, name: true },
    });
    const classIds = instructorClasses.map((c) => c.id);

    if (classIds.length === 0) {
      return this.getEmptyAnalyticsData();
    }

    const [submissions, previousSubmissions] = await Promise.all([
      this.prisma.submission.findMany({
        where: {
          assignment: { classId: { in: classIds } },
          status: { in: ['SUBMITTED', 'GRADED'] },
          submittedAt: { gte: startDate },
        },
        include: {
          assignment: { select: { class: { select: { name: true } } } },
          plagiarismChecks: { select: { score: true } },
        },
      }),
      this.prisma.submission.findMany({
        where: {
          assignment: { classId: { in: classIds } },
          status: { in: ['SUBMITTED', 'GRADED'] },
          submittedAt: { gte: previousStartDate, lt: startDate },
        },
      }),
    ]);

    const stats = this.calculateStats(submissions, previousSubmissions);
    const charts = this.calculateChartData(submissions, instructorClasses);

    return { stats, charts };
  }

  async getInstructorDashboard(instructorId: string) {
    const instructorClasses = await this.prisma.class.findMany({
      where: { instructorId },
      select: { id: true, name: true },
    });
    const classIds = instructorClasses.map((c) => c.id);

    if (classIds.length === 0) {
      return {
        stats: {
          totalClasses: 0,
          totalStudents: 0,
          activeAssignments: 0,
          pendingGrading: 0,
          completionRate: 0,
          averageGrade: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
        },
        recentClasses: [],
        recentSubmissions: [],
        recentTransactions: [],
        analyticsData: {
          classActivity: [],
          submissionTrends: [],
          gradingTrends: [],
        },
      };
    }

    const thirtyDaysAgo = new Date(
      new Date().setDate(new Date().getDate() - 30),
    );

    const [
      totalStudents,
      activeAssignments,
      pendingGrading,
      gradedSubmissions,
      transactions,
      recentClasses,
      recentSubmissions,
      recentTransactions,
      chartSubmissions,
    ] = await Promise.all([
      this.prisma.classEnrollment.count({
        where: { classId: { in: classIds } },
      }),
      this.prisma.assignment.count({
        where: { classId: { in: classIds }, active: true },
      }),
      this.prisma.submission.count({
        where: {
          assignment: { classId: { in: classIds } },
          status: 'SUBMITTED',
        },
      }),
      this.prisma.submission.findMany({
        where: {
          assignment: { classId: { in: classIds } },
          status: 'GRADED',
        },
        select: { grade: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId: instructorId, status: 'SUCCESS' },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.class.findMany({
        where: { instructorId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { _count: { select: { enrollments: true } } },
      }),
      this.prisma.submission.findMany({
        where: {
          assignment: { classId: { in: classIds } },
          status: 'SUBMITTED',
        },
        orderBy: { submittedAt: 'desc' },
        take: 3,
        include: {
          student: { select: { fullName: true } },
          assignment: { select: { title: true } },
        },
      }),
      this.prisma.transaction.findMany({
        where: { userId: instructorId, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { assignment: { select: { title: true } } },
      }),
      this.prisma.submission.findMany({
        where: {
          assignment: { classId: { in: classIds } },
          status: { in: ['SUBMITTED', 'GRADED'] },
          submittedAt: { gte: thirtyDaysAgo },
        },
        include: {
          assignment: { select: { class: { select: { name: true } } } },
        },
      }),
    ]);

    const totalGraded = gradedSubmissions.length;
    const totalSubmissionsForRate = await this.prisma.submission.count({
      where: {
        assignment: { classId: { in: classIds } },
        status: { in: ['SUBMITTED', 'GRADED'] },
      },
    });
    const completionRate =
      totalSubmissionsForRate > 0
        ? Math.round((totalGraded / totalSubmissionsForRate) * 100)
        : 0;
    const grades = gradedSubmissions
      .map((s) => s.grade)
      .filter((g) => g !== null) as number[];
    const averageGrade =
      grades.length > 0
        ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)
        : 0;
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyRevenue = transactions
      .filter((t) => t.createdAt >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    const stats = {
      totalClasses: classIds.length,
      totalStudents,
      activeAssignments,
      pendingGrading,
      completionRate,
      averageGrade,
      totalRevenue,
      monthlyRevenue,
    };

    const chartData = this.calculateChartData(
      chartSubmissions,
      instructorClasses,
    );

    return {
      stats,
      recentClasses,
      recentSubmissions,
      recentTransactions,
      analyticsData: {
        classActivity: chartData.classActivity,
        submissionTrends: chartData.submissionTrends,
        gradingTrends: chartData.gradingSpeed,
      },
    };
  }

  /**
   * Menghitung statistik utama.
   */
  private calculateStats(submissions: any[], previousSubmissions: any[]) {
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(
      (s) => s.status === 'GRADED',
    ).length;
    const pendingGrading = totalSubmissions - gradedSubmissions;
    const completionRate =
      totalSubmissions > 0
        ? Math.round((gradedSubmissions / totalSubmissions) * 100)
        : 0;

    const plagiarismScores = submissions
      .map((s) => s.plagiarismChecks?.score)
      .filter((score) => score != null);
    const avgPlagiarism =
      plagiarismScores.length > 0
        ? Math.round(
            plagiarismScores.reduce((a, b) => a + b, 0) /
              plagiarismScores.length,
          )
        : 0;

    const activeClasses = new Set(
      submissions.map((s) => s.assignment.class.name),
    ).size;

    const prevTotal = previousSubmissions.length;
    const prevGraded = previousSubmissions.filter(
      (s) => s.status === 'GRADED',
    ).length;
    const prevCompletionRate =
      prevTotal > 0 ? Math.round((prevGraded / prevTotal) * 100) : 0;
    const rateChange = completionRate - prevCompletionRate;

    return {
      completionRate,
      avgPlagiarism,
      totalSubmissions,
      gradedSubmissions,
      pendingGrading,
      activeClasses,
      trend: {
        completionRate: `${rateChange >= 0 ? '+' : ''}${rateChange.toFixed(1)}`,
      },
    };
  }

  /**
   * Menyiapkan data untuk grafik.
   */
  private calculateChartData(
    submissions: any[],
    instructorClasses: { id: string; name: string }[],
  ) {
    return {
      submissionTrends: this.getSubmissionTrends(submissions),
      gradingSpeed: this.getGradingSpeed(submissions),
      classActivity: this.getClassActivity(submissions, instructorClasses),
      plagiarismDistribution: this.getPlagiarismDistribution(submissions),
    };
  }

  private getSubmissionTrends(submissions: any[]) {
    const trends = new Map<
      string,
      { date: string; submissions: number; graded: number }
    >();
    submissions.forEach((s) => {
      if (!s.submittedAt) return;
      const date = s.submittedAt.toISOString().split('T')[0];
      if (!trends.has(date)) {
        trends.set(date, { date, submissions: 0, graded: 0 });
      }
      const day = trends.get(date);
      // Tambahkan pengecekan untuk memastikan 'day' tidak undefined
      if (day) {
        day.submissions++;
        if (s.status === 'GRADED') {
          day.graded++;
        }
      }
    });
    return Array.from(trends.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  private getGradingSpeed(submissions: any[]) {
    // NOTE: Kalkulasi kecepatan grading (avg(updatedAt - submittedAt)) cukup kompleks
    // dan idealnya menggunakan query database yang lebih efisien.
    // Untuk saat ini, kami menyediakan data placeholder.
    return [
      { date: '2025-06-01', avgHours: 22 },
      { date: '2025-06-02', avgHours: 20 },
    ];
  }

  private getClassActivity(
    submissions: any[],
    instructorClasses: { id: string; name: string }[],
  ) {
    const activity = new Map<string, number>();
    instructorClasses.forEach((c) => activity.set(c.name, 0));
    submissions.forEach((s) => {
      const className = s.assignment.class.name;
      activity.set(className, (activity.get(className) || 0) + 1);
    });
    return Array.from(activity.entries())
      .map(([name, submissions]) => ({ name, submissions }))
      .sort((a, b) => b.submissions - a.submissions);
  }

  private getPlagiarismDistribution(submissions: any[]) {
    const dist = { '0-10%': 0, '11-30%': 0, '31-50%': 0, '>50%': 0 };
    submissions.forEach((s) => {
      const score = s.plagiarismChecks?.score;
      if (score != null) {
        if (score <= 10) dist['0-10%']++;
        else if (score <= 30) dist['11-30%']++;
        else if (score <= 50) dist['31-50%']++;
        else dist['>50%']++;
      }
    });
    return Object.entries(dist).map(([range, count]) => ({ range, count }));
  }

  private getEmptyAnalyticsData() {
    return {
      stats: {
        completionRate: 0,
        avgPlagiarism: 0,
        totalSubmissions: 0,
        gradedSubmissions: 0,
        pendingGrading: 0,
        activeClasses: 0,
        trend: { completionRate: '+0.0' },
      },
      charts: {
        submissionTrends: [],
        gradingSpeed: [],
        classActivity: [],
        plagiarismDistribution: [
          { range: '0-10%', count: 0 },
          { range: '11-30%', count: 0 },
          { range: '31-50%', count: 0 },
          { range: '>50%', count: 0 },
        ],
      },
    };
  }
}
