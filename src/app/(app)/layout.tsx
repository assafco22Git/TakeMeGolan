import { redirect } from "next/navigation";
import { getRole } from "@/lib/role";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole();
  if (!role) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#0a0f1e]">
      <Sidebar role={role} />
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
