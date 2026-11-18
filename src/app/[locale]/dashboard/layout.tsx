import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/modules/auth/session";
import prisma from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import type { Locale } from "@/i18n/messages";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect({ href: "/login?next=/dashboard", locale: locale as Locale });
    return null;
  }

  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return (
    <div className="container-page py-8">
      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <DashboardSidebar
            role={user.role}
            firstName={user.firstName}
            lastName={user.lastName}
            unread={unread}
          />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
