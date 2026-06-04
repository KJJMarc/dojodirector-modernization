export interface GradeAwardDeleteCandidate {
  id: string;
}

export function canDeleteGradeAward(
  awards: GradeAwardDeleteCandidate[],
  awardId: string,
): boolean {
  if (awards.length <= 1) {
    return false;
  }

  return awards.some((award) => award.id === awardId);
}

export function countRemainingGradeAwardsAfterDelete(
  awards: GradeAwardDeleteCandidate[],
  awardId: string,
): number {
  return awards.filter((award) => award.id !== awardId).length;
}
