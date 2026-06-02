export interface StudentPortalPreviewStudent {
  id: string;
  fullName: string;
}

export interface StudentPortalPreviewEntryData {
  featuredStudent: StudentPortalPreviewStudent | null;
  students: StudentPortalPreviewStudent[];
}

export function studentPortalPath(clubSlug: string, userId: string) {
  return `/student-portal/${clubSlug.trim()}/${userId.trim()}`;
}
