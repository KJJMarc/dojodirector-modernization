import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCompetitionBracketFromForm } from "@/lib/competition-bracket.shared";
import {
  escapeSvgText,
  renderBracketSvg,
  validateBracketSvg,
} from "@/lib/competition-bracket-svg.shared";

test("escapeSvgText escapes XML special characters", () => {
  assert.equal(
    escapeSvgText(`Tom O'Connor & "Smith" <tag>`),
    "Tom O&apos;Connor &amp; &quot;Smith&quot; &lt;tag&gt;",
  );
});

test("renderBracketSvg escapes special characters in all user-facing text", () => {
  const bracket = buildCompetitionBracketFromForm({
    competitionName: "Tom O'Connor",
    divisionName: "Smith & Jones",
    scheduleTime: "10:30am",
    notes: "1 minute <no subs> & golden score",
    competitorsText: "Tom O'Connor\nSmith & Jones\nA < B\nC > D",
  });

  const svg = renderBracketSvg(bracket);

  assert.match(svg, /Tom O&apos;Connor/);
  assert.match(svg, /Smith &amp; Jones/);
  assert.match(svg, /1 minute &lt;no subs&gt; &amp; golden score/);
  assert.doesNotMatch(svg, /1 minute <no subs>/);
  assert.match(svg, /font-family="Helvetica, Arial, sans-serif"/);

  validateBracketSvg(svg);
});

test("renderBracketSvg does not include match numbers or hashtags", () => {
  const bracket = buildCompetitionBracketFromForm({
    competitionName: "Competition Name",
    divisionName: "Bracket Name",
    competitorsText: "Alex Smith\nSam Wilson\nMia Patel\nNoah Brown",
  });

  const svg = renderBracketSvg(bracket);

  assert.doesNotMatch(svg, />#\d+</);
  assert.doesNotMatch(svg, /data-match="/);
});
