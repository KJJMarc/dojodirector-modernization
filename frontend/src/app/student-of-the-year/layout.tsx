import { PublicSiteFooter } from "@/components/layout/public-site-footer";

export default function StudentOfTheYearLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="student-of-the-year-page flex min-h-screen flex-col bg-dojo-black text-white antialiased">
      <div className="flex-1">{children}</div>
      <PublicSiteFooter />
    </div>
  );
}
