import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import type { Role } from "@/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const username = (session.user as { username: string }).username || session.user.name || "User";
  const role = (session.user as { role: Role }).role;

  return (
    <div className="flex min-h-screen bg-[#0a0f1e] dark:bg-[#0a0f1e]">
      <Sidebar username={username} role={role} />
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
