import { jsonOk } from "@/lib/api";
import { destroySession } from "@/modules/auth/session";
import { forbiddenOriginResponse, isSameOriginRequest } from "@/lib/security/origin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOriginResponse();
  await destroySession();
  return jsonOk({ ok: true });
}
