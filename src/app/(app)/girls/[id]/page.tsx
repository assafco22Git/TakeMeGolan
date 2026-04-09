import { getRole } from "@/lib/role";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import GirlForm from "@/components/girls/GirlForm";
import DeleteButton from "@/components/girls/DeleteButton";
import { formatDate } from "@/lib/utils";

export default async function GirlDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (!role) redirect("/login");

  const { id } = await params;
  const girl = await prisma.girl.findUnique({ where: { id } });
  if (!girl) notFound();

  return (
    <div className="px-4 py-6 md:px-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{girl.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {formatDate(girl.startDate)} – {formatDate(girl.endDate)}
          </p>
        </div>
        {role === "OWNER" && <DeleteButton girlId={id} />}
      </div>
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <GirlForm
          mode="edit"
          girlId={id}
          initial={{
            ...girl,
            startDate: girl.startDate.toISOString(),
            endDate: girl.endDate?.toISOString() ?? null,
            createdAt: girl.createdAt.toISOString(),
            updatedAt: girl.updatedAt.toISOString(),
            status: girl.status as "ACTIVE" | "PAST",
          }}
        />
      </div>
    </div>
  );
}
