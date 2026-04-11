import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      {/* On mobile, add bottom padding for the fixed bottom nav bar */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {children}
      </div>
    </div>
  )
}
