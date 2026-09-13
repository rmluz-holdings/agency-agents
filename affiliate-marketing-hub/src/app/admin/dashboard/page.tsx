import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Analytics, link cloaking, content generation and settings in one place.",
};

function DashboardFallback() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-10 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 w-full" />
        ))}
      </div>
      <div className="skeleton h-80 w-full" />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <AdminDashboard />
    </Suspense>
  );
}
