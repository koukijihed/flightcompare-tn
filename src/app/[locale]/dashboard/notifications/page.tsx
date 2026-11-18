import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inbox } from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/modules/auth/session";
import { MarkAllRead } from "@/components/dashboard/mark-all-read";
import { MarkNotificationRead } from "@/components/dashboard/mark-notification-read";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, intlLocale } from "@/lib/utils";
import type { Locale } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login?next=/dashboard/notifications", locale: locale as Locale });
    return null;
  }

  const [t, notifications, unread] = await Promise.all([
    getTranslations("dashboard"),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  const intl = intlLocale(locale);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-extrabold text-navy-900">
              {t("notifications")}
            </h1>
            <p className="mt-1 text-sm text-navy-500">
              {t("notificationsSubtitle", { count: unread })}
            </p>
          </div>
          {unread > 0 ? <MarkAllRead /> : null}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-navy-100 bg-white p-10 text-center shadow-card">
          <Inbox className="mx-auto h-8 w-8 text-navy-300" aria-hidden />
          <p className="mt-3 text-sm text-navy-500">{t("noNotifications")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-white p-4 shadow-card"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  notification.read ? "bg-navy-200" : "bg-sky-500"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy-900">{notification.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-navy-500">
                  {notification.message}
                </p>
                <p className="mt-1 text-[11px] text-navy-400">
                  {formatDateTime(notification.createdAt, intl)}
                </p>
              </div>
              {notification.read ? (
                <Badge variant="outline">{t("read")}</Badge>
              ) : (
                <MarkNotificationRead id={notification.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
