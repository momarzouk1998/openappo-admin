import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("\n🔑 VAPID Keys (أضفهم في ملف .env):\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log("\n⚠️  احتفظ بهذه المفاتيح في مكان آمن ولا تشاركها.\n");
