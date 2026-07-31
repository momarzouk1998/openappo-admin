# 🚀 دليل نشر Admin Dashboard على السيرفر — كل حاجة مطلوبة منك

> **الهدف:** ملف واحد فيه كل خطوة مطلوبة منك عشان نظام الإدارة يشتغل على `Admin.openappo.com`
> بنفس طريقة (mazaya + opengym + rtx) على نفس السيرفر `64.226.118.40`.

---

## 📌 ملخص سريع (الترتيب)

```
1. إنشاء GitHub Repo جديد
2. إضافة Secrets على الـ Repo
3. إضافة DNS في Hostinger
4. إعداد السيرفر (Nginx + SSL + مجلد البيانات)
5. أول Push = أول Deploy أوتوماتيك ✅
```

---

## الخطوة 1: إنشاء GitHub Repository

1. ادخل على [github.com/new](https://github.com/new)
2. أنشئ repo جديد:
   - **Repository name:** `openappo-admin`
   - **Visibility:** Private
   - **لا تضيف** README أو .gitignore (هنرفعهم من عندك)
3. بعد الإنشاء، انسخ الـ SSH URL:
   ```
   git@github.com-momarzouk:momarzouk1998/openappo-admin.git
   ```

---

## الخطوة 2: إضافة GitHub Secrets 🔐

> هذه أهم خطوة — بدونها الـ CI/CD مش هيشتغل.

ادخل على:
```
https://github.com/momarzouk1998/openappo-admin/settings/secrets/actions
```

اضغط **"New repository secret"** وأضف الآتي:

| اسم الـ Secret | القيمة | الشرح |
|---|---|---|
| `SSH_PRIVATE_KEY` | محتوى ملف المفتاح الخاص `opengym_ci` | نفس المفتاح المستخدم في OpenGym/RTX |
| `SSH_HOST` | `64.226.118.40` | عنوان IP للسيرفر (DigitalOcean) |
| `SSH_USER` | `root` | اسم المستخدم للدخول على السيرفر |

### كيف تحصل على `SSH_PRIVATE_KEY`؟
هو **نفس المفتاح** المستخدم في مشروع OpenGym و RTX. تقدر تنسخه من:
- **GitHub → OpenGym repo → Settings → Secrets → SSH_PRIVATE_KEY** (انسخه)
- أو من جهازك: `cat ~/.ssh/opengym_ci` (لو حفظته محلياً)

> ⚠️ **مهم:** لازم تنسخ المفتاح بالكامل من أول سطر `-----BEGIN OPENSSH PRIVATE KEY-----` لحد آخر سطر `-----END OPENSSH PRIVATE KEY-----`.

---

## الخطوة 3: إعداد DNS في Hostinger 🌐

> عشان `Admin.openappo.com` يشاور على السيرفر بتاعك.

1. ادخل على [لوحة تحكم Hostinger](https://hpanel.hostinger.com/)
2. اختار دومين `openappo.com`
3. روح قسم **DNS / Zone Editor**
4. أضف سجل **A Record** جديد:

| النوع | الاسم (Name) | القيمة (Points to) | TTL |
|---|---|---|---|
| **A** | `Admin` | `64.226.118.40` | `14400` (أو Auto) |

> ⚠️ **مهم جداً:** اكتب `Admin` فقط (بدون `.openappo.com`)، هوستنجر بيكمله تلقائياً.

5. اضغط **Save** / **Add Record**
6. انتظر من **5 دقائق إلى ساعة** حتى ينتشر الـ DNS.

### التأكد من نجاح الـ DNS:
شغّل هذا الأمر من جهازك (بعد الانتظار):
```bash
nslookup Admin.openappo.com
```
المفروض يرجع:
```
Address: 64.226.118.40
```

---

## الخطوة 4: إعداد السيرفر (مرة واحدة فقط) 🖥️

> هذه الخطوات تتنفذ على السيرفر نفسه عبر SSH.

### 4.1 — ادخل على السيرفر:
```bash
ssh root@64.226.118.40
```

### 4.2 — أنشئ مجلد المشروع (لحفظ قاعدة البيانات SQLite):
بما أن النظام يستخدم SQLite، يجب حفظ ملف القاعدة خارج الكونتينر لكي لا يضيع عند كل تحديث.
```bash
mkdir -p /opt/openappo-admin/data
```

### 4.3 — أنشئ ملف البيئة:
```bash
cat > /opt/openappo-admin/.env <<EOF
DATABASE_URL="file:/app/data/dev.db"
NEXT_PUBLIC_SITE_URL="https://Admin.openappo.com"
NODE_ENV=production
PORT=3010
HOSTNAME=0.0.0.0
EOF
```

> ⚠️ **المنفذ `3010`** — اخترناه ليكون خاص بلوحة الإدارة:
> - `3000` = OpenGym
> - `3001` = Mazaya
> - `3006` = RTX
> - `3010` = Admin Dashboard ✅

### 4.4 — أنشئ Nginx config لـ Admin:
```bash
cat > /etc/nginx/sites-available/openappo-admin <<'NGINX'
server {
    server_name Admin.openappo.com;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
NGINX
```

### 4.5 — فعّل الموقع وأعد تشغيل Nginx:
```bash
ln -sf /etc/nginx/sites-available/openappo-admin /etc/nginx/sites-enabled/openappo-admin
nginx -t && systemctl reload nginx
```

### 4.6 — أصدر شهادة SSL (بعد ما الـ DNS ينتشر):
```bash
certbot --nginx -d Admin.openappo.com
```
> اختار **2** (Redirect all HTTP to HTTPS) لو سألك.

---

## الخطوة 5: أول Push = أول Deploy 🚀

بعد ما تخلّص الخطوات اللي فوق، ارجع لجهازك ونفّذ:

```bash
cd "D:\OPEN APPS\DigitalOcian Projects\openappo-admin"

# تهيئة Git (لو مش مهيّأ قبل كده)
git init
git add .
git commit -m "feat: Admin Dashboard - initial deployment"
git branch -M main
git remote add origin git@github.com-momarzouk:momarzouk1998/openappo-admin.git
git push -u origin main
```

**بعد الـ Push:**
1. ادخل على: `https://github.com/momarzouk1998/openappo-admin/actions`
2. تابع الـ workflow وهو بيبني الصورة ➡️ يرفعها لـ GHCR ➡️ يسحبها على السيرفر ➡️ يشغلها.
3. لما يخلّص ✅ → اختبر: `https://Admin.openappo.com`

---

## 📋 قائمة مراجعة (Checklist) — اتأكد من كل حاجة

| # | المهمة | الحالة |
|---|---|---|
| 1 | إنشاء GitHub repo `openappo-admin` (Private) | ☐ |
| 2 | إضافة Secret: `SSH_PRIVATE_KEY` | ☐ |
| 3 | إضافة Secret: `SSH_HOST` = `64.226.118.40` | ☐ |
| 4 | إضافة Secret: `SSH_USER` = `root` | ☐ |
| 5 | إضافة A Record في Hostinger: `Admin` → `64.226.118.40` | ☐ |
| 6 | التأكد من انتشار DNS: `nslookup Admin.openappo.com` | ☐ |
| 7 | إنشاء مجلد البيانات `/opt/openappo-admin/data` على السيرفر | ☐ |
| 8 | إنشاء ملف `/opt/openappo-admin/.env` على السيرفر | ☐ |
| 9 | إنشاء Nginx config + تفعيله | ☐ |
| 10 | إصدار شهادة SSL بـ Certbot | ☐ |
| 11 | أول `git push origin main` من جهازك | ☐ |
| 12 | متابعة GitHub Actions حتى ✅ | ☐ |
| 13 | اختبار `https://Admin.openappo.com` | ☐ |

---

## 📁 ملفات لازم تكون موجودة في المشروع (تم تجهيزها)

| الملف | الوظيفة | الحالة |
|---|---|---|
| `Dockerfile` | بناء الصورة بـ Docker (المنفذ 3010) وتوصيل قاعدة SQLite | ✅ سيتم |
| `.dockerignore` | تنقية سياق البناء | ✅ سيتم |
| `.github/workflows/deploy.yml` | أتمتة الرفع لـ Github و السيرفر | ✅ سيتم |
| `next.config.ts` | تفعيل `output: "standalone"` | ✅ سيتم |

---

## 🛡️ ملاحظات أمنية مهمة

1. **مترفعش ملف `.env` ولا ملف `dev.db` على GitHub أبداً**.
2. **الـ `SSH_PRIVATE_KEY`** في GitHub Secrets مش بيظهر لحد تاني.

---

## 🚨 لو حصلت مشكلة

| المشكلة | الحل |
|---|---|
| `nslookup` مش بيرجع الـ IP | انتظر ساعة — DNS بياخد وقت. أو تأكد إن الـ A Record اتضاف صح في Hostinger |
| GitHub Actions فشل في الـ Deploy | تأكد إن `SSH_PRIVATE_KEY` اتنسخ صح بالكامل |
| الموقع بيرجع `502` | الكونتينر مش شغّال — `ssh root@64.226.118.40` وبعدها `docker logs openappo-admin --tail 50` |
| الموقع بيرجع `ERR_SSL` | شغّل `certbot --nginx -d Admin.openappo.com` على السيرفر |

---

*آخر تحديث: 2026-07-31*
