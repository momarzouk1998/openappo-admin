import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";
import { firstAllowedPage } from "@/lib/pages";
import { getAdmins } from "@/app/actions";
import SettingsForm from "@/components/SettingsForm";
import UsersManagement from "@/components/UsersManagement";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = await getCurrentAdmin();
  if (admin && admin.role === "staff" && !admin.allowedPages.includes("/settings")) {
    redirect(firstAllowedPage(admin.allowedPages));
  }

  const admins = admin?.role === "owner" ? await getAdmins() : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 dir-rtl">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">إعدادات الحساب ⚙️</h1>

      <SettingsForm />

      {admin?.role === "owner" && <UsersManagement initialAdmins={admins} />}
    </div>
  );
}
