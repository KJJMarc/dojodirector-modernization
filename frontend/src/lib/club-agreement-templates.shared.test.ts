import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLUB_AGREEMENT_TYPE_GUEST_TRAINING,
  CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
  formatAgreementPdfBannerText,
  formatAgreementPdfDocumentTitle,
  getDefaultGuestTrainingAgreementContent,
  getDefaultMemberPortalAgreementContent,
  resolveAgreementContentFromTemplate,
  shouldSkipAgreementPdfHeaderParagraph,
} from "@/lib/club-agreement-templates.shared";

const KINGSTON_CLUB_NAME = "Kingston Jiu Jitsu";
const KIDS_CLUB_NAME = "Kingston Jiu Jitsu Kids";
const BAHAMAS_CLUB_NAME = "Bahamas Jiu Jitsu";

test("formatAgreementPdfBannerText uppercases academy names", () => {
  assert.equal(formatAgreementPdfBannerText(BAHAMAS_CLUB_NAME), "BAHAMAS JIU JITSU");
  assert.equal(formatAgreementPdfBannerText(KINGSTON_CLUB_NAME), "KINGSTON JIU JITSU");
  assert.equal(
    formatAgreementPdfBannerText(KIDS_CLUB_NAME),
    "KINGSTON JIU JITSU KIDS",
  );
});

test("getDefaultMemberPortalAgreementContent keeps Kingston PDF title unchanged", () => {
  const content = getDefaultMemberPortalAgreementContent();

  assert.equal(content.pdfDocumentTitle, "Kingston Jiu Jitsu Membership Agreement");
});

test("getDefaultGuestTrainingAgreementContent keeps Kingston PDF title unchanged", () => {
  const content = getDefaultGuestTrainingAgreementContent();

  assert.equal(content.pdfDocumentTitle, "Kingston Jiu Jitsu Training Agreement");
});

test("getDefaultMemberPortalAgreementContent uses Bahamas Jiu Jitsu branding", () => {
  const content = getDefaultMemberPortalAgreementContent(BAHAMAS_CLUB_NAME);

  assert.equal(content.pdfDocumentTitle, "Bahamas Jiu Jitsu Membership Agreement");
});

test("getDefaultGuestTrainingAgreementContent uses Bahamas Jiu Jitsu branding", () => {
  const content = getDefaultGuestTrainingAgreementContent(BAHAMAS_CLUB_NAME);

  assert.equal(content.pdfDocumentTitle, "Bahamas Jiu Jitsu Training Agreement");
});

test("getDefaultGuestTrainingAgreementContent keeps KJJ Kids PDF title unchanged", () => {
  const content = getDefaultGuestTrainingAgreementContent(KIDS_CLUB_NAME);

  assert.equal(content.pdfDocumentTitle, "Kingston Jiu Jitsu Kids Training Agreement");
});

test("resolveAgreementContentFromTemplate builds Kingston PDF titles from short template titles", () => {
  const content = resolveAgreementContentFromTemplate({
    clubName: KINGSTON_CLUB_NAME,
    agreementType: CLUB_AGREEMENT_TYPE_MEMBER_PORTAL,
    title: "Membership Agreement",
    version: "1.0",
    body: "Agreement body text.",
    updatedAt: "2026-06-13T10:00:00.000Z",
  });

  assert.equal(content.pdfDocumentTitle, "Kingston Jiu Jitsu Membership Agreement");
});

test("resolveAgreementContentFromTemplate builds Bahamas PDF titles from Bahamas templates", () => {
  const content = resolveAgreementContentFromTemplate({
    clubName: BAHAMAS_CLUB_NAME,
    agreementType: CLUB_AGREEMENT_TYPE_GUEST_TRAINING,
    title: "Bahamas Jiu Jitsu Training Agreement",
    version: "1.0",
    body: "Bahamas guest training agreement template.",
    updatedAt: "2026-06-13T10:00:00.000Z",
  });

  assert.equal(content.pdfDocumentTitle, "Bahamas Jiu Jitsu Training Agreement");
});

test("formatAgreementPdfDocumentTitle avoids duplicating the academy prefix", () => {
  assert.equal(
    formatAgreementPdfDocumentTitle(
      BAHAMAS_CLUB_NAME,
      "Bahamas Jiu Jitsu Membership Agreement",
    ),
    "Bahamas Jiu Jitsu Membership Agreement",
  );
});

test("shouldSkipAgreementPdfHeaderParagraph skips legacy Kingston and dynamic academy banners", () => {
  const bahamasBanner = formatAgreementPdfBannerText(BAHAMAS_CLUB_NAME);

  assert.equal(
    shouldSkipAgreementPdfHeaderParagraph("KINGSTON JIU JITSU", bahamasBanner),
    true,
  );
  assert.equal(
    shouldSkipAgreementPdfHeaderParagraph("BAHAMAS JIU JITSU", bahamasBanner),
    true,
  );
  assert.equal(
    shouldSkipAgreementPdfHeaderParagraph("Welcome to training.", bahamasBanner),
    false,
  );
});
