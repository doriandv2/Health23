import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { getSession } from "./auth";
import { VISITOR_COOKIE } from "./session";

type TrackInput = {
  type: string;
  path?: string;
  referrer?: string;
  productId?: string;
  valuePence?: number;
  meta?: Record<string, unknown>;
  userId?: string;
};

/** Records an analytics event, attributing it to the visitor and logged-in user. */
export async function track(input: TrackInput) {
  try {
    const jar = await cookies();
    const session = await getSession();
    const userId = input.userId ?? session?.uid;
    await db.event.create({
      data: {
        type: input.type,
        visitorId: jar.get(VISITOR_COOKIE)?.value,
        userId,
        path: input.path,
        referrer: input.referrer,
        productId: input.productId,
        valuePence: input.valuePence,
        meta: input.meta ? JSON.stringify(input.meta) : undefined,
      },
    });
    if (userId) await db.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});
  } catch (err) {
    console.error("track failed", err);
  }
}
