import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWaitlistOfferMessageBody,
  getEffectiveSpacesAvailable,
  isSessionPubliclyBookable,
  parseWaitlistOfferSessionIdFromBody,
  stripWaitlistOfferMarkerFromBody,
  WAITLIST_ACCEPT_SUCCESS_MESSAGE,
  WAITLIST_OFFER_UNAVAILABLE_MESSAGE,
} from "@/lib/session-waitlist.shared";

describe("getEffectiveSpacesAvailable", () => {
  it("treats an active waitlist offer as holding the last open spot", () => {
    const spaces = getEffectiveSpacesAvailable({
      capacity: 20,
      bookedCount: 19,
      hasActiveWaitlistOffer: true,
      waitingQueueCount: 0,
    });

    assert.equal(spaces, 0);
  });

  it("keeps the class closed while students are still waiting", () => {
    const spaces = getEffectiveSpacesAvailable({
      capacity: 20,
      bookedCount: 19,
      hasActiveWaitlistOffer: false,
      waitingQueueCount: 2,
    });

    assert.equal(spaces, 0);
  });

  it("opens the class when there is no offer and no waiting queue", () => {
    const spaces = getEffectiveSpacesAvailable({
      capacity: 20,
      bookedCount: 19,
      hasActiveWaitlistOffer: false,
      waitingQueueCount: 0,
    });

    assert.equal(spaces, 1);
    assert.equal(
      isSessionPubliclyBookable({
        capacity: 20,
        bookedCount: 19,
        hasActiveWaitlistOffer: false,
        waitingQueueCount: 0,
      }),
      true,
    );
  });
});

describe("waitlist offer copy", () => {
  it("uses distinct success and unavailable messages", () => {
    assert.notEqual(WAITLIST_ACCEPT_SUCCESS_MESSAGE, WAITLIST_OFFER_UNAVAILABLE_MESSAGE);
  });
});

describe("waitlist offer portal message marker", () => {
  it("round-trips the session id through the message body", () => {
    const sessionId = "df08da48-7270-4f0f-82ba-67f1296b232f";
    const body = buildWaitlistOfferMessageBody({
      className: "BJJ Fundamentals",
      dateLabel: "Monday 8 June",
      timeLabel: "13:00–14:00",
      sessionId,
    });

    assert.equal(parseWaitlistOfferSessionIdFromBody(body), sessionId);
    assert.equal(stripWaitlistOfferMarkerFromBody(body).includes("session:"), false);
  });
});
