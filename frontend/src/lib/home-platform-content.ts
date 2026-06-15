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
  description: "Access student and instructor tools from your phone.",
  cta: {
    label: "Open the App",
    href: "/app",
  },
} as const;

export const HOME_PLATFORM_OVERVIEW = {
  eyebrow: "Platform",
  title: "Everything your academy runs on",
  description:
    "One connected system for admin teams, students and instructors — from records and bookings to retention and growth.",
} as const;

export const HOME_PLATFORM_SECTIONS: HomePlatformSection[] = [
  {
    id: "academy-management",
    eyebrow: "Academy management",
    title: "Academy Management",
    description: "Members, memberships, agreements and access across programmes and locations.",
    features: [
      {
        title: "Student Records",
        description: "Profiles, contact details, belt history and academy information.",
      },
      {
        title: "Membership Management",
        description: "Active, inactive and pending membership status at a glance.",
      },
      {
        title: "Digital Training Agreements",
        description: "Issue, accept and store membership agreements with PDF records.",
      },
      {
        title: "Programme Memberships",
        description: "Adult, kids and specialist programmes with scoped access.",
      },
      {
        title: "Multi-Academy Support",
        description: "Separate branding, timetables, portals and admin teams per academy.",
      },
      {
        title: "Role-Based Access",
        description: "Permissions for students, instructors, club admins and super admins.",
      },
    ],
  },
  {
    id: "student-experience",
    eyebrow: "Student experience",
    title: "Student Experience",
    description: "A mobile-ready portal for training, progress and academy communication.",
    features: [
      {
        title: "Student Portal",
        description: "Bookings, attendance history, grading and academy messages.",
      },
      {
        title: "Attendance Cards",
        description: "Visual yearly cards that make participation easy to read.",
      },
      {
        title: "Belt Progression",
        description: "Current rank and grading history in one place.",
      },
      {
        title: "Membership Status",
        description: "Clear view of membership and programme access.",
      },
      {
        title: "Agreement Downloads",
        description: "Signed membership agreement PDFs from the portal.",
      },
      {
        title: "Home Screen Access",
        description: "Quick portal access from the Dojo Director app.",
      },
    ],
  },
  {
    id: "class-operations",
    eyebrow: "Class operations",
    title: "Class Operations",
    description: "Timetables, bookings, attendance and session management in one flow.",
    features: [
      {
        title: "Class Booking",
        description: "Students reserve places on the academy timetable.",
      },
      {
        title: "Attendance Tracking",
        description: "Reliable participation records over time.",
      },
      {
        title: "Instructor Registers",
        description: "Mobile-friendly registers for marking attendance on the mat.",
      },
      {
        title: "Session Management",
        description: "One-off and recurring sessions from a central schedule.",
      },
      {
        title: "Capacity Management",
        description: "Session limits as bookings come in.",
      },
      {
        title: "Booking Cancellation",
        description: "Cancel sessions and manage affected bookings.",
      },
    ],
  },
  {
    id: "instructor-tools",
    eyebrow: "Instructor tools",
    title: "Instructor Tools",
    description: "Coaching tools for classes, attendance and academy communication.",
    features: [
      {
        title: "Instructor Portal",
        description: "Dedicated sign-in with academy-specific navigation.",
      },
      {
        title: "Today's Classes",
        description: "Upcoming sessions, cover assignments and teaching schedule.",
      },
      {
        title: "Fast Attendance Registers",
        description: "Session-by-session attendance on phone or tablet.",
      },
      {
        title: "Class Roster Views",
        description: "See who is booked and checked in for each session.",
      },
      {
        title: "Attendance Kiosk",
        description: "Self check-in kiosk for students at today's classes.",
      },
      {
        title: "Portal Messages",
        description: "Academy notices inside the instructor portal.",
      },
    ],
  },
  {
    id: "retention-growth",
    eyebrow: "Retention and growth",
    title: "Retention & Growth",
    description: "Follow up on enquiries, spot risks and understand class performance.",
    features: [
      {
        title: "Student Retention Dashboard",
        description: "Participation trends and students who may need outreach.",
      },
      {
        title: "At-Risk Student Flags",
        description: "Risk levels to help admins prioritise follow-up.",
      },
      {
        title: "Suggested Actions",
        description: "Practical prompts tied to each retention record.",
      },
      {
        title: "Trial Enquiry Tracking",
        description: "Website trial enquiries in the admin leads workflow.",
      },
      {
        title: "Lead Attribution",
        description: "Google Ads, Meta, organic search, referral and direct traffic.",
      },
      {
        title: "Class Metrics",
        description: "Attendance trends and class performance data.",
      },
    ],
  },
];

export const APP_INSTALL_GUIDANCE = {
  title: "Install on your phone",
  description:
    "Add Dojo Director to your home screen for quick access in full-screen mode. No app store required.",
  iosSteps: ["Open this page in Safari", "Tap Share", "Choose Add to Home Screen"],
  androidSteps: ["Open this page in Chrome", "Tap the browser menu", "Choose Install app or Add to Home Screen"],
  features: [
    "Student and instructor login",
    "Class booking and upcoming bookings",
    "Attendance cards and grading progress",
    "Instructor registers and portal messages",
  ],
} as const;
