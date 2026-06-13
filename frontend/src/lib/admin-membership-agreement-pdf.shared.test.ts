import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";
import {
  buildAdminMembershipAgreementPdfApiPath,
  buildLegacyKingstonMembershipAgreementPdfApiPath,
  isMembershipAgreementPdfClubAccessAllowed,
  resolveLegacyKingstonMembershipAgreementPdfClubSlug,
} from "@/lib/admin-membership-agreement-pdf.shared";

const STUDENT_USER_ID = "student-user-123";

test("buildAdminMembershipAgreementPdfApiPath builds club-scoped routes", () => {
  assert.equal(
    buildAdminMembershipAgreementPdfApiPath(KINGSTON_CLUB_SLUG, STUDENT_USER_ID),
    `/api/admin/${KINGSTON_CLUB_SLUG}/students/${STUDENT_USER_ID}/membership-agreement-pdf`,
  );
  assert.equal(
    buildAdminMembershipAgreementPdfApiPath(
      BAHAMAS_JIU_JITSU_CLUB_SLUG,
      STUDENT_USER_ID,
    ),
    `/api/admin/${BAHAMAS_JIU_JITSU_CLUB_SLUG}/students/${STUDENT_USER_ID}/membership-agreement-pdf`,
  );
  assert.equal(
    buildAdminMembershipAgreementPdfApiPath(
      KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
      STUDENT_USER_ID,
    ),
    `/api/admin/${KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG}/students/${STUDENT_USER_ID}/membership-agreement-pdf`,
  );
});

test("legacy Kingston route remains available for backwards compatibility", () => {
  assert.equal(
    buildLegacyKingstonMembershipAgreementPdfApiPath(STUDENT_USER_ID),
    `/api/admin/students/${STUDENT_USER_ID}/membership-agreement-pdf`,
  );
  assert.equal(
    resolveLegacyKingstonMembershipAgreementPdfClubSlug(),
    KINGSTON_CLUB_SLUG,
  );
});

test("Kingston admin can access Kingston student membership agreement PDFs", () => {
  assert.equal(
    isMembershipAgreementPdfClubAccessAllowed({
      adminClubSlug: KINGSTON_CLUB_SLUG,
      studentClubSlug: KINGSTON_CLUB_SLUG,
    }),
    true,
  );
});

test("Bahamas admin can access Bahamas student membership agreement PDFs", () => {
  assert.equal(
    isMembershipAgreementPdfClubAccessAllowed({
      adminClubSlug: BAHAMAS_JIU_JITSU_CLUB_SLUG,
      studentClubSlug: BAHAMAS_JIU_JITSU_CLUB_SLUG,
    }),
    true,
  );
});

test("Bahamas admin cannot access Kingston student membership agreement PDFs", () => {
  assert.equal(
    isMembershipAgreementPdfClubAccessAllowed({
      adminClubSlug: BAHAMAS_JIU_JITSU_CLUB_SLUG,
      studentClubSlug: KINGSTON_CLUB_SLUG,
    }),
    false,
  );
});

test("KJJ Kids admin access remains scoped to KJJ Kids students", () => {
  assert.equal(
    isMembershipAgreementPdfClubAccessAllowed({
      adminClubSlug: KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
      studentClubSlug: KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
    }),
    true,
  );
  assert.equal(
    isMembershipAgreementPdfClubAccessAllowed({
      adminClubSlug: KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
      studentClubSlug: KINGSTON_CLUB_SLUG,
    }),
    false,
  );
  assert.equal(
    isMembershipAgreementPdfClubAccessAllowed({
      adminClubSlug: KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
      studentClubSlug: BAHAMAS_JIU_JITSU_CLUB_SLUG,
    }),
    false,
  );
});
