import prisma from "@/lib/prisma";
import { jsonOk } from "@/lib/api";
import { requireUserApi } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUserApi();
  if (!user) return response;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return jsonOk({
    unreadCount,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      metadata: notification.metadata,
      createdAt: notification.createdAt.toISOString(),
    })),
  });
}
