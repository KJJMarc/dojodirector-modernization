import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clubCompetitionBracketGeneratorPath,
  competitionBracketPdfApiPath,
  isCompetitionBracketGeneratorClub,
} from "@/lib/admin-competition-bracket.shared";

test("isCompetitionBracketGeneratorClub allows Kingston, Kids and Bahamas academies", () => {
  assert.equal(isCompetitionBracketGeneratorClub("kingston-jiu-jitsu"), true);
  assert.equal(isCompetitionBracketGeneratorClub("kingston-jiu-jitsu-kids"), true);
  assert.equal(isCompetitionBracketGeneratorClub("bahamas-jiu-jitsu"), true);
});

test("isCompetitionBracketGeneratorClub rejects other academies", () => {
  assert.equal(isCompetitionBracketGeneratorClub("other-academy"), false);
  assert.equal(isCompetitionBracketGeneratorClub(""), false);
});

test("competition bracket paths are scoped to the club slug", () => {
  assert.equal(
    clubCompetitionBracketGeneratorPath("bahamas-jiu-jitsu"),
    "/admin/bahamas-jiu-jitsu/competitions/bracket-generator",
  );
  assert.equal(
    competitionBracketPdfApiPath("kingston-jiu-jitsu"),
    "/api/admin/kingston-jiu-jitsu/competitions/bracket-generator/pdf",
  );
});
