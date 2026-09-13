'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEventSubmittedEmail, sendEventStatusEmail } from '@/lib/resend/emails'
import { revalidatePath } from 'next/cache'

export async function createEventAction(formData: {
  title: string
  description: string
  location_name?: string
  address: string
  city: string
  state?: string
  category_id?: string
  category_name?: string
  latitude?: number
  longitude?: number
  image_url: string
  event_date: string
  ticket_price: string
  whatsapp_info: string
  facebook_url?: string
  instagram_handle?: string
}) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'Usuário não autenticado.' }
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.is_banned || profile?.is_blocked) {
    return { success: false, error: 'Sua conta está bloqueada ou banida de cadastrar eventos.' }
  }

  const { data: event, error: insertError } = await supabase
    .from('events')
    .insert({
      producer_id: user.id,
      category_id: formData.category_id || null,
      category_name: formData.category_name || null,
      title: formData.title,
      description: formData.description,
      location_name: formData.location_name || null,
      address: formData.address,
      city: formData.city,
      state: formData.state || null,
      latitude: formData.latitude || null,
      longitude: formData.longitude || null,
      image_url: formData.image_url,
      event_date: formData.event_date,
      ticket_price: formData.ticket_price,
      whatsapp_info: formData.whatsapp_info,
      facebook_url: formData.facebook_url || null,
      instagram_handle: formData.instagram_handle || null,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError) {
    console.error('Erro ao cadastrar evento:', insertError)
    return { success: false, error: insertError.message }
  }

  // Send email notification to producer
  if (user.email) {
    await sendEventSubmittedEmail(user.email, profile?.name || 'Produtor', formData.title)
  }

  revalidatePath('/produtor/dashboard')
  revalidatePath('/')
  return { success: true, event }
}

export async function updateEventStatusAction(
  eventId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Não autorizado.' }
  }

  // Verify Admin / SuperAdmin role
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || !['admin', 'superadmin'].includes(adminProfile.role)) {
    return { success: false, error: 'Apenas administradores podem alterar o status de eventos.' }
  }

  // Update event
  const { data: event, error: updateError } = await supabase
    .from('events')
    .update({
      status,
      rejection_reason: rejectionReason || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select('*, profiles(name, id)')
    .single()

  if (updateError || !event) {
    return { success: false, error: updateError?.message || 'Evento não encontrado.' }
  }

  // Fetch producer email from auth if possible
  const { data: producerUser } = await supabase.auth.admin?.getUserById(event.producer_id)
    .catch(() => ({ data: { user: null } })) || { data: { user: null } }

  // Send status update email if we have producer's email
  if (producerUser?.user?.email) {
    await sendEventStatusEmail(
      producerUser.user.email,
      event.profiles?.name || 'Produtor',
      event.title,
      status,
      rejectionReason
    )
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  revalidatePath(`/evento/${eventId}`)
  return { success: true }
}

export async function deleteEventAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Allow owner or admin to delete
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/produtor/dashboard')
  revalidatePath('/')
  return { success: true }
}
