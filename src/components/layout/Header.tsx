import { createClient } from '@/lib/supabase/server'
import { User } from 'lucide-react'

interface HeaderProps {
  title?: string
}

export default async function Header({ title }: HeaderProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between gap-4 px-4 sm:px-6 shrink-0">
      <h1 className="text-lg font-semibold text-slate-800 truncate min-w-0">{title}</h1>
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">
            {profile?.full_name || profile?.email || user?.email}
          </span>
        </div>
      </div>
    </header>
  )
}
