import { getRole } from "@/lib/role";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import GirlForm from "@/components/girls/GirlForm";
import DeleteButton from "@/components/girls/DeleteButton";
import CommentsSection from "@/components/girls/CommentsSection";
import EndRelationshipButton from "@/components/girls/EndRelationshipButton";
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
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${!girl.startDate ? "text-red-500 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
            {girl.name}
            {!girl.startDate && <span title="No first date yet">🚩</span>}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {girl.startDate ? formatDate(girl.startDate) : "—"} – {formatDate(girl.endDate)}
          </p>
        </div>
        {role === "OWNER" && <DeleteButton girlId={id} />}
      </div>
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <GirlForm
          mode="edit"
          girlId={id}
          readOnly={role !== "OWNER"}
          initial={{
            ...girl,
            startDate: girl.startDate?.toISOString() ?? undefined,
            endDate: girl.endDate?.toISOString() ?? null,
            matchedDate: girl.matchedDate?.toISOString() ?? null,
            firstWhatsapp: girl.firstWhatsapp?.toISOString() ?? null,
            createdAt: girl.createdAt.toISOString(),
            updatedAt: girl.updatedAt.toISOString(),
            status: girl.status as "ACTIVE" | "PAST",
          }}
        />
      </div>

      {role === "OWNER" && girl.status === "ACTIVE" && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <EndRelationshipButton girlId={id} />
        </div>
      )}

      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h2 className="text-slate-900 dark:text-white font-semibold mb-4">Comments</h2>
        <CommentsSection girlId={id} currentRole={role} />
      </div>
    </div>
  );
}
