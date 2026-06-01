export interface ClassPopularityRow {
  rank: number;
  classId: string;
  className: string;
  scheduleLabel: string;
  dayLabel: string;
  timeLabel: string;
  locationLabel: string;
  instructorLabel: string;
  totalBookings: number;
  attendanceCount: number;
  utilisationPercent: number | null;
  sessionCount: number;
}

export interface InstructorMetricRow {
  rank: number;
  instructorUserId: string;
  instructorName: string;
  totalBookings: number;
  attendanceCount: number;
  sessionsTaught: number;
  averageAttendancePerSession: number | null;
  utilisationPercent: number | null;
}

export interface NoShowStudentRow {
  userId: string;
  studentName: string;
  email: string | null;
  totalNoShows: number;
  recentNoShows: number;
  isRepeatOffender: boolean;
  lastNoShowDate: string | null;
}

export interface ClassTrendRow {
  className: string;
  scheduleLabel: string;
  metricLabel: string;
  valueLabel: string;
}

export interface DayTimePopularityRow {
  dayLabel: string;
  timeLabel: string;
  totalBookings: number;
  attendanceCount: number;
}

export interface AdminClassMetricsPageData {
  periodLabel: string;
  totalNoShows: number;
  popularClasses: ClassPopularityRow[];
  instructorMetrics: InstructorMetricRow[];
  noShowStudents: NoShowStudentRow[];
  trends: {
    mostAttended: ClassTrendRow[];
    leastAttended: ClassTrendRow[];
    poorUtilisation: ClassTrendRow[];
    repeatedNoShows: ClassTrendRow[];
    popularDayTimes: DayTimePopularityRow[];
  };
  hasSessionData: boolean;
  trackedClassSlots: number;
}
