import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
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
  assert.doesNotMatch(svg, /font-family="Helvetica, Arial, "Segoe UI"/);

  validateBracketSvg(svg);
});

test("sharp can rasterize bracket svg with apostrophes, ampersands and angle brackets", async () => {
  const bracket = buildCompetitionBracketFromForm({
    competitionName: "Tom O'Connor",
    divisionName: "Smith & Jones",
    scheduleTime: "10:30am",
    notes: "1 minute <no subs> & golden score",
    competitorsText:
      "Tom O'Connor\nSmith & Jones\nMia Patel\nSam Wilson",
  });

  const svg = renderBracketSvg(bracket);
  validateBracketSvg(svg);

  const png = await sharp(Buffer.from(svg))
    .resize(1684, 1191, { fit: "fill" })
    .png()
    .toBuffer();

  assert.ok(png.length > 0);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
});
