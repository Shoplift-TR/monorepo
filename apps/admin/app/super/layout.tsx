import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import Sidebar from "@/components/Sidebar";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedAdminRoute allowedRoles={["super_admin"]}>
      <div className="flex min-h-screen bg-[#F5F5F5]">
        <Sidebar />
        <main className="flex-1 lg:ml-[240px] pt-16 lg:pt-0 pb-12 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedAdminRoute>
  );
}
