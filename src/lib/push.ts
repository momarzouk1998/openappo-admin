import webpush from "web-push";

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:admin@openappo.com", VAPID_PUBLIC, VAPID_PRIVATE);
}

export { webpush };
export const vapidPublicKey = VAPID_PUBLIC;
