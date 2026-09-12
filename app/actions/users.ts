'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserStatusAction(
  userId: string,
  updates: { is_banned?: boolean; is_blocked?: boolean; role?: 'producer' | 'admin' | 'superadmin' }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Não autorizado.' }
  }

  // Check superadmin/admin role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || !['admin', 'superadmin'].includes(currentProfile.role)) {
    return { success: false, error: 'Apenas administradores podem alterar status de usuários.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/dashboard')
  return { success: true }
}
