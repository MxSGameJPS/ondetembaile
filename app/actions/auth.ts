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
    if (error.message?.toLowerCase().includes('confirmation email')) {
      return {
        success: false,
        error:
          'Erro de confirmação de e-mail no Supabase Auth. Para permitir cadastro imediato sem exigir confirmação, desative a opção "Confirm email" no painel do Supabase (Authentication > User Signups).',
      }
    }
    return { success: false, error: error.message }
  }

  // Explicitly sign out if a session was created automatically so the user must confirm email and login manually
  if (data.session) {
    await supabase.auth.signOut()
  }

  // Send welcome email via Resend (safely)
  try {
    await sendWelcomeEmail(formData.email, formData.name)
  } catch (emailErr) {
    console.error('Erro ao disparar e-mail de boas-vindas pelo Resend:', emailErr)
  }

  return { success: true, email: formData.email, requiresConfirmation: true }
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
