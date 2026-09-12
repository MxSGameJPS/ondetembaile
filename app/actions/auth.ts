'use server'

import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/resend/emails'

export async function signUpProducerAction(formData: {
  name: string
  company?: string
  email: string
  whatsapp: string
  city: string
  password: string
  termsAccepted: boolean
}) {
  if (!formData.termsAccepted) {
    return { success: false, error: 'Você precisa aceitar os termos de uso para se cadastrar.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        name: formData.name,
        company: formData.company || '',
        whatsapp: formData.whatsapp,
        city: formData.city,
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Send welcome email via Resend
  await sendWelcomeEmail(formData.email, formData.name)

  return { success: true, user: data.user }
}

export async function signInAction(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Check if user is banned
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, is_blocked, role')
      .eq('id', data.user.id)
      .single()

    if (profile?.is_banned) {
      await supabase.auth.signOut()
      return { success: false, error: 'Sua conta foi banida. Entre em contato com o suporte.' }
    }
  }

  return { success: true, user: data.user }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return { success: true }
}
