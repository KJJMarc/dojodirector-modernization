import type { MembershipAgreementSection } from "@/lib/student-portal-agreements.shared";

export const BAHAMAS_JIU_JITSU_CLUB_NAME = "Bahamas Jiu Jitsu";
export const BAHAMAS_MEMBERSHIP_AGREEMENT_VERSION = "1.0";
export const BAHAMAS_GUEST_TRAINING_AGREEMENT_VERSION =
  BAHAMAS_MEMBERSHIP_AGREEMENT_VERSION;

export const BAHAMAS_MEMBERSHIP_AGREEMENT_TITLE =
  "Bahamas Jiu Jitsu Membership Agreement";
export const BAHAMAS_GUEST_TRAINING_AGREEMENT_TITLE =
  "Bahamas Jiu Jitsu Training Agreement";

/**
 * Membership agreement for Bahamas Jiu Jitsu — adapted from the Kingston
 * membership agreement for academy operations in The Bahamas.
 */
export const BAHAMAS_MEMBERSHIP_AGREEMENT_SECTIONS: MembershipAgreementSection[] =
  [
    {
      paragraphs: [
        "BAHAMAS JIU JITSU",
        "MEMBERSHIP AGREEMENT",
        `Version ${BAHAMAS_MEMBERSHIP_AGREEMENT_VERSION}`,
        "Welcome to Bahamas Jiu Jitsu.",
        "This agreement applies to all training activities provided by Bahamas Jiu Jitsu in Nassau, The Bahamas, including but not limited to Brazilian Jiu Jitsu, grappling, wrestling, takedowns, striking classes, fitness training, conditioning sessions, seminars, competitions and related academy activities.",
        'By selecting "I Agree" and signing electronically, I confirm that I have read, understood and accepted the terms of this agreement.',
      ],
    },
    {
      title: "TRAINING RISKS",
      paragraphs: [
        "I understand that martial arts and combat sports involve physical contact and carry an inherent risk of injury.",
        "Possible injuries may include bruises, cuts, strains, sprains, joint injuries, fractures, concussion and other minor or serious injuries that may occur during training.",
        "I voluntarily choose to participate in training activities and accept the ordinary risks that are inherent in martial arts training.",
      ],
    },
    {
      title: "SAFE TRAINING",
      paragraphs: [
        "I agree to train safely, responsibly and respectfully at all times.",
        "I will follow the instructions of instructors and academy staff.",
        "I will immediately stop training and inform an instructor if I believe that continuing to train may place myself or another participant at risk.",
      ],
    },
    {
      title: "HEALTH DECLARATION",
      paragraphs: [
        "I confirm that I am responsible for informing the academy of any medical condition, injury or health concern that may affect my ability to participate safely.",
        "I understand that the academy does not provide medical advice and that participation decisions remain my responsibility.",
        "If I am injured or become unwell during training, I will inform an instructor as soon as reasonably possible.",
      ],
    },
    {
      title: "HYGIENE AND SAFETY",
      paragraphs: [
        "I agree to maintain appropriate personal hygiene and training equipment standards.",
        "I understand that I should not attend training if I have a contagious illness, infectious skin condition or any condition that could place other members at risk.",
      ],
    },
    {
      title: "MEMBERSHIP AND CONDUCT",
      paragraphs: [
        "I understand that academy membership may be suspended or terminated if I behave in a manner that is unsafe, abusive, threatening, discriminatory or otherwise inappropriate towards members, instructors or staff.",
      ],
    },
    {
      title: "PHOTOGRAPHS AND VIDEO",
      paragraphs: [
        "I understand that photographs or video may occasionally be taken during classes, seminars or academy events for coaching, promotional or educational purposes.",
        "If I do not wish to appear in photographs or video, I will notify the academy.",
      ],
    },
    {
      title: "DATA PROTECTION",
      paragraphs: [
        "I understand that Bahamas Jiu Jitsu will store and process personal information for legitimate academy purposes including membership administration, attendance tracking, grading records, communication and safety management.",
        "Personal information will be handled in accordance with applicable data protection laws of the Commonwealth of The Bahamas.",
      ],
    },
    {
      title: "LIABILITY",
      paragraphs: [
        "I understand that Bahamas Jiu Jitsu instructors and staff will take reasonable steps to provide a safe training environment but cannot eliminate all risks associated with participation in martial arts activities.",
        "I accept responsibility for my own conduct and participation while training.",
        "Nothing in this agreement affects any legal rights that cannot be excluded under the applicable laws of the Commonwealth of The Bahamas.",
      ],
    },
    {
      title: "PARENT OR LEGAL GUARDIAN CONSENT",
      paragraphs: [
        "If the participant is under 18 years of age, the person signing this agreement confirms that they are the participant's parent or legal guardian and have authority to accept this agreement on the participant's behalf.",
        "The parent or legal guardian consents to the participant taking part in academy activities and accepts the responsibilities outlined in this agreement on behalf of the participant where applicable.",
      ],
    },
    {
      title: "ELECTRONIC ACCEPTANCE",
      paragraphs: [
        'By selecting "I Agree" within the student portal, I confirm that I have read, understood and accepted this Membership Agreement.',
        "My name, date, time of acceptance and electronic acceptance record will be stored within Dojo Director as evidence of acceptance.",
      ],
    },
    {
      title: "GOVERNING LAW",
      paragraphs: [
        "This agreement is governed by the laws of the Commonwealth of The Bahamas.",
      ],
    },
  ];

function mapParagraphForGuestDisplay(paragraph: string) {
  if (paragraph === "MEMBERSHIP AGREEMENT") {
    return "TRAINING AGREEMENT";
  }

  return paragraph.replace(/Membership Agreement/gi, "Training Agreement");
}

/** Same legal sections as the Bahamas membership agreement; guest UI uses Training Agreement titles. */
export const BAHAMAS_GUEST_TRAINING_AGREEMENT_SECTIONS: MembershipAgreementSection[] =
  BAHAMAS_MEMBERSHIP_AGREEMENT_SECTIONS.map((section) => ({
    ...section,
    paragraphs: section.paragraphs.map(mapParagraphForGuestDisplay),
  }));
