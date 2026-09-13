import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false as const,
      error: 'Usuário não autenticado.',
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['admin', 'superadmin'].includes(profile.role)) {
    return {
      ok: false as const,
      error: 'Acesso permitido apenas para administradores.',
    }
  }

  return {
    ok: true as const,
    supabase,
    user,
    role: profile.role as 'admin' | 'superadmin',
  }
}
