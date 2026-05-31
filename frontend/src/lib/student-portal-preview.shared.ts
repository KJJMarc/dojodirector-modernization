export interface StudentPortalPreviewStudent {
  id: string;
  fullName: string;
}

export interface StudentPortalPreviewEntryData {
  featuredStudent: StudentPortalPreviewStudent | null;
  students: StudentPortalPreviewStudent[];
}

export function studentPortalPath(userId: string) {
  return `/student-portal/${userId}`;
}
