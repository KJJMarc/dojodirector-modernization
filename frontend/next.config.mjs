/** @type {import('next').NextConfig} */
const STUDENT_PORTAL_USER_ID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const nextConfig = {
  async redirects() {
    return [
      {
        source: `/student-portal/:userId(${STUDENT_PORTAL_USER_ID})/:section*`,
        destination: "/student-portal/legacy/:userId/:section*",
        permanent: false,
      },
      {
        source: `/student-portal/:userId(${STUDENT_PORTAL_USER_ID})`,
        destination: "/student-portal/legacy/:userId",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
