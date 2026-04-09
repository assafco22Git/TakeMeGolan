import { getRole } from "@/lib/role";
import { redirect } from "next/navigation";
import GirlForm from "@/components/girls/GirlForm";

export default async function NewGirlPage() {
  const role = await getRole();
  if (!role) redirect("/login");
  if (role !== "OWNER") redirect("/girls");

  return (
    <div className="px-4 py-6 md:px-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add New Girl</h1>
        <p className="text-slate-500 text-sm mt-1">Track a new relationship</p>
      </div>
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <GirlForm mode="create" />
      </div>
    </div>
  );
}
