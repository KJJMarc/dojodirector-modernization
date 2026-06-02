export const STUDENT_OF_THE_YEAR_FIRST_YEAR = 2014;
export const STUDENT_OF_THE_YEAR_YEARS_BEYOND_CURRENT = 5;

export const STUDENT_OF_THE_YEAR_INTRO =
  "Every year since 2014, Kingston Jiu Jitsu has selected one student who has gone above and beyond. This award recognises someone who has shown excellent progress, helped others, supported the academy, and represented the values of the club. It is an individualised award, chosen each year to recognise a standout member of the adult academy.";

export const STUDENT_OF_THE_YEAR_PAGE_ID = "student-of-the-year";

export function studentOfTheYearPublicPath() {
  return "/student-of-the-year";
}

export function studentOfTheYearAdminEditPath(clubSlug: string) {
  const normalized = clubSlug.trim().replace(/^\/+|\/+$/g, "");
  return `/admin/${normalized}/academy-pages/student-of-the-year/edit`;
}

export interface StudentOfTheYearAward {
  id: string;
  year: number;
  studentName: string;
}

export interface StudentOfTheYearPageData {
  clubName: string;
  awards: StudentOfTheYearAward[];
}

export function getStudentOfTheYearYearOptions(currentYear = new Date().getFullYear()) {
  const lastYear = Math.max(
    currentYear + STUDENT_OF_THE_YEAR_YEARS_BEYOND_CURRENT,
    STUDENT_OF_THE_YEAR_FIRST_YEAR,
  );
  const years: number[] = [];

  for (let year = lastYear; year >= STUDENT_OF_THE_YEAR_FIRST_YEAR; year -= 1) {
    years.push(year);
  }

  return years;
}

export function sortStudentOfTheYearAwardsDesc(
  awards: StudentOfTheYearAward[],
): StudentOfTheYearAward[] {
  return [...awards].sort((left, right) => right.year - left.year);
}
