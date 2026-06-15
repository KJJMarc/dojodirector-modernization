export interface HomeFeatureCard {
  title: string;
  description: string;
}

export interface HomePlatformSection {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  features: HomeFeatureCard[];
}

export const HOME_APP_BANNER = {
  eyebrow: "Installable web app",
  title: "Dojo Director App",
  description:
    "Students and instructors can install Dojo Director directly to their iPhone or Android home screen from the website. No App Store required — just add the installable web app and sign in.",
  bullets: [
    "Student login",
    "Instructor login",
    "Class booking",
    "Upcoming bookings",
    "Attendance cards",
    "Grading progress",
    "Instructor registers",
  ],
  primaryCta: {
    label: "Open the app",
    href: "/app",
  },
  secondaryCta: {
    label: "Student login",
    href: "/student-portal/login",
  },
} as const;

export const HOME_PLATFORM_SECTIONS: HomePlatformSection[] = [
  {
    id: "academy-management",
    eyebrow: "Academy management",
    title: "Run every academy from one platform",
    description:
      "Centralise member records, memberships, agreements and access control across programmes and locations.",
    features: [
      {
        title: "Student Records",
        description:
          "Keep profiles, contact details, belt history and academy information organised in one place.",
      },
      {
        title: "Membership Management",
        description:
          "Track active, inactive and pending memberships with clear status across your student base.",
      },
      {
        title: "Digital Training Agreements",
        description:
          "Issue, accept and store membership agreements digitally with downloadable PDF records.",
      },
      {
        title: "Programme Memberships",
        description:
          "Assign students to adult, kids and specialist programmes with programme-scoped access.",
      },
      {
        title: "Multi-Academy Support",
        description:
          "Operate separate academies with their own branding, timetables, portals and admin teams.",
      },
      {
        title: "Role-Based Access",
        description:
          "Separate permissions for students, instructors, club admins and super administrators.",
      },
    ],
  },
  {
    id: "class-operations",
    eyebrow: "Class operations",
    title: "Keep classes running smoothly",
    description:
      "Manage timetables, bookings, attendance and session changes without spreadsheets or disconnected tools.",
    features: [
      {
        title: "Class Booking",
        description:
          "Let students browse upcoming sessions and reserve places on the academy timetable.",
      },
      {
        title: "Attendance Tracking",
        description:
          "Mark attendance from registers and maintain reliable participation records over time.",
      },
      {
        title: "Instructor Registers",
        description:
          "Give instructors fast mobile-friendly registers for marking attendance on the mat.",
      },
      {
        title: "Session Management",
        description:
          "Create, edit and manage one-off and recurring class sessions from a central schedule.",
      },
      {
        title: "Capacity Management",
        description:
          "Set session limits and keep class sizes under control as bookings come in.",
      },
      {
        title: "Booking Cancellation",
        description:
          "Cancel sessions and manage affected bookings when plans change.",
      },
    ],
  },
  {
    id: "student-experience",
    eyebrow: "Student experience",
    title: "A portal students actually use",
    description:
      "Give members a clear, mobile-ready view of training, progress and academy communication.",
    features: [
      {
        title: "Student Portal",
        description:
          "Secure sign-in for bookings, attendance history, grading and academy messages.",
      },
      {
        title: "Attendance Cards",
        description:
          "Visual yearly attendance cards that make participation easy to understand at a glance.",
      },
      {
        title: "Belt Progression",
        description:
          "Show current rank and grading history so students can see progress over time.",
      },
      {
        title: "Membership Status",
        description:
          "Keep students informed about their membership and programme access.",
      },
      {
        title: "Agreement Downloads",
        description:
          "Let students access signed membership agreement PDFs from their portal.",
      },
      {
        title: "Mobile App Access",
        description:
          "Install Dojo Director to the home screen for quick portal access in standalone mode.",
      },
    ],
  },
  {
    id: "instructor-tools",
    eyebrow: "Instructor tools",
    title: "Built for coaches on the floor",
    description:
      "Help instructors see their classes, take attendance quickly and stay connected to the academy.",
    features: [
      {
        title: "Instructor Portal",
        description:
          "Dedicated sign-in for coaches with academy-specific tools and navigation.",
      },
      {
        title: "Today's Classes",
        description:
          "View upcoming sessions, cover assignments and the classes you are teaching.",
      },
      {
        title: "Fast Attendance Registers",
        description:
          "Mark attendance session by session with a layout designed for phones and tablets.",
      },
      {
        title: "Class Roster Views",
        description:
          "See who is booked and checked in for each session directly from the register.",
      },
      {
        title: "Attendance Kiosk",
        description:
          "Open a self check-in kiosk for students arriving at today's classes.",
      },
      {
        title: "Portal Messages",
        description:
          "Receive academy notices and updates inside the instructor portal.",
      },
    ],
  },
  {
    id: "retention-growth",
    eyebrow: "Retention and growth",
    title: "Grow the academy and keep students training",
    description:
      "Spot risks early, follow up on enquiries and understand what is working across your classes.",
    features: [
      {
        title: "Student Retention Dashboard",
        description:
          "Monitor participation trends and identify students who may need a follow-up.",
      },
      {
        title: "At-Risk Student Flags",
        description:
          "Highlight students by risk level so admins can prioritise outreach.",
      },
      {
        title: "Suggested Actions",
        description:
          "Review practical follow-up prompts tied to each retention record.",
      },
      {
        title: "Trial Enquiry Tracking",
        description:
          "Capture website trial enquiries and manage them through the admin leads workflow.",
      },
      {
        title: "Lead Attribution",
        description:
          "See whether enquiries came from Google Ads, Meta, organic search, referral or direct traffic.",
      },
      {
        title: "Class Metrics",
        description:
          "Review attendance trends and class performance data to inform academy decisions.",
      },
    ],
  },
];
