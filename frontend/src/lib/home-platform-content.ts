export interface HomePlatformCategory {
  id: string;
  title: string;
  description: string;
  bullets: readonly string[];
}

export const HOME_APP_BANNER = {
  eyebrow: "Installable web app",
  title: "Dojo Director App",
  description:
    "Install Dojo Director on your phone for quick access to your academy tools.",
  cta: {
    label: "Open the app",
    href: "/app",
  },
} as const;

export const HOME_PLATFORM_OVERVIEW = {
  eyebrow: "Platform",
  title: "The academy operating system",
  description:
    "Four connected areas of the platform — built for admins, students and instructors working from the same system.",
} as const;

export const HOME_PLATFORM_CATEGORIES: HomePlatformCategory[] = [
  {
    id: "academy-management",
    title: "Academy Management",
    description: "Manage your academy from a single platform.",
    bullets: [
      "Student Records",
      "Membership Management",
      "Digital Agreements",
      "Multi-Academy Support",
      "Programme Management",
      "Role-Based Access",
    ],
  },
  {
    id: "class-operations",
    title: "Class Operations",
    description: "Keep classes running smoothly every day.",
    bullets: [
      "Class Booking",
      "Attendance Tracking",
      "Instructor Registers",
      "Capacity Management",
      "Booking Management",
      "Session Scheduling",
    ],
  },
  {
    id: "student-experience",
    title: "Student Experience",
    description: "Give students the tools they need to stay engaged.",
    bullets: [
      "Student Portal",
      "Attendance Cards",
      "Grading Progress",
      "Membership Status",
      "Agreement Access",
      "Mobile App Access",
    ],
  },
  {
    id: "instructor-tools",
    title: "Instructor Tools",
    description: "Support instructors both on and off the mats.",
    bullets: [
      "Instructor Portal",
      "Attendance Registers",
      "Student Lookup",
      "Promotion Candidates",
      "Session Management",
      "Academy Communications",
    ],
  },
];

export const APP_INSTALL_GUIDANCE = {
  title: "Install Dojo Director on your phone",
  description:
    "Add to Home Screen for quick access in full-screen mode. No app store required.",
  iosSteps: ["Open this page in Safari", "Tap Share", "Choose Add to Home Screen"],
  androidSteps: [
    "Open this page in Chrome",
    "Tap the browser menu",
    "Choose Add to Home Screen",
  ],
} as const;
