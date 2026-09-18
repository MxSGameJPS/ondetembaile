'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEventSubmittedEmail, sendEventStatusEmail } from '@/lib/resend/emails'
import { revalidatePath } from 'next/cache'
import { geocodeLocation } from '@/lib/geocoding/server'

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
  event_end_date?: string
  ticket_price?: string
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

  const startTime = new Date(formData.event_date).getTime()
  const endTime = formData.event_end_date
    ? new Date(formData.event_end_date).getTime()
    : null

  if (Number.isNaN(startTime)) {
    return { success: false, error: 'Informe uma data inicial válida.' }
  }

  if (endTime !== null && (Number.isNaN(endTime) || endTime < startTime)) {
    return { success: false, error: 'A data final precisa ser igual ou posterior à data inicial.' }
  }

  let latitude = formData.latitude
  let longitude = formData.longitude

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    try {
      const geocoded = await geocodeLocation({
        address: formData.address,
        locationName: formData.location_name,
        city: formData.city,
        state: formData.state,
      })

      latitude = geocoded?.lat
      longitude = geocoded?.lng
    } catch (error) {
      console.error('Evento será salvo sem coordenadas automáticas:', error)
    }
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
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      image_url: formData.image_url,
      event_date: formData.event_date,
      event_end_date: formData.event_end_date || null,
      ticket_price: formData.ticket_price || 'Consultar',
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

export async function updateEventAction(
  eventId: string,
  formData: {
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
    event_end_date?: string
    ticket_price?: string
    whatsapp_info: string
    facebook_url?: string
    instagram_handle?: string
    status?: 'pending' | 'approved' | 'rejected'
  }
) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'Usuário não autenticado.' }
  }

  // Get user profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile && ['admin', 'superadmin'].includes(profile.role)

  // Verify event existence and ownership if not admin
  const { data: existingEvent } = await supabase
    .from('events')
    .select('producer_id, status, rejection_is_permanent')
    .eq('id', eventId)
    .single()

  if (!existingEvent) {
    return { success: false, error: 'Evento não encontrado.' }
  }

  if (!isAdmin && existingEvent.producer_id !== user.id) {
    return { success: false, error: 'Apenas administradores ou o criador do evento podem editá-lo.' }
  }

  if (!isAdmin) {
    if (existingEvent.status !== 'rejected') {
      return {
        success: false,
        error: 'O evento só pode ser editado pelo produtor quando a moderação solicitar ajustes.',
      }
    }

    if (existingEvent.rejection_is_permanent) {
      return {
        success: false,
        error: 'Este evento foi recusado permanentemente e não pode mais ser editado.',
      }
    }
  }

  const startTime = new Date(formData.event_date).getTime()
  const endTime = formData.event_end_date
    ? new Date(formData.event_end_date).getTime()
    : null

  if (Number.isNaN(startTime)) {
    return { success: false, error: 'Informe uma data inicial válida.' }
  }

  if (endTime !== null && (Number.isNaN(endTime) || endTime < startTime)) {
    return { success: false, error: 'A data final precisa ser igual ou posterior à data inicial.' }
  }

  let latitude = formData.latitude
  let longitude = formData.longitude

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    try {
      const geocoded = await geocodeLocation({
        address: formData.address,
        locationName: formData.location_name,
        city: formData.city,
        state: formData.state,
      })

      latitude = geocoded?.lat
      longitude = geocoded?.lng
    } catch (error) {
      console.error('Coordenadas não puderam ser recalculadas:', error)
    }
  }

  const updateData: Record<string, any> = {
    title: formData.title,
    description: formData.description,
    location_name: formData.location_name || null,
    address: formData.address,
    city: formData.city,
    state: formData.state || null,
    category_id: formData.category_id || null,
    category_name: formData.category_name || null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    image_url: formData.image_url,
    event_date: formData.event_date,
    event_end_date: formData.event_end_date || null,
    ticket_price: formData.ticket_price || 'Consultar',
    whatsapp_info: formData.whatsapp_info,
    facebook_url: formData.facebook_url || null,
    instagram_handle: formData.instagram_handle || null,
    updated_at: new Date().toISOString(),
  }

  if (isAdmin && formData.status) {
    updateData.status = formData.status

    if (formData.status !== 'rejected') {
      updateData.rejection_reason = null
      updateData.rejection_is_permanent = false
    }
  } else if (!isAdmin) {
    // A producer can only edit a normally rejected event. Saving it resubmits
    // the event to moderation and clears the previous rejection state.
    updateData.status = 'pending'
    updateData.rejection_reason = null
    updateData.rejection_is_permanent = false
  }

  const { data: updatedEvent, error: updateError } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .select()
    .single()

  if (updateError) {
    console.error('Erro ao atualizar evento:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/produtor/dashboard')
  revalidatePath('/')
  revalidatePath(`/evento/${eventId}`)
  return { success: true, event: updatedEvent }
}

export async function updateEventStatusAction(
  eventId: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string,
  options?: {
    permanent?: boolean
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || !['admin', 'superadmin'].includes(adminProfile.role)) {
    return { success: false, error: 'Apenas administradores podem alterar o status de eventos.' }
  }

  const permanentRejection = status === 'rejected' && Boolean(options?.permanent)

  if (permanentRejection && adminProfile.role !== 'superadmin') {
    return {
      success: false,
      error: 'Apenas o SuperAdmin pode recusar um evento permanentemente.',
    }
  }

  const cleanReason = rejectionReason?.trim() || ''

  if (status === 'rejected' && !cleanReason) {
    return {
      success: false,
      error: 'Informe o motivo da recusa para orientar o produtor.',
    }
  }

  const { data: event, error: updateError } = await supabase
    .from('events')
    .update({
      status,
      rejection_reason: status === 'rejected' ? cleanReason : null,
      rejection_is_permanent: permanentRejection,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select('*, profiles(name, id)')
    .single()

  if (updateError || !event) {
    return { success: false, error: updateError?.message || 'Evento não encontrado.' }
  }

  let notificationSent = false
  const adminClient = createAdminClient()

  if (!adminClient) {
    console.error(
      'E-mail de moderação não enviado: SUPABASE_SERVICE_ROLE_KEY não está configurada no servidor.'
    )
  } else {
    const { data: producerUser, error: producerError } =
      await adminClient.auth.admin.getUserById(event.producer_id)

    if (producerError) {
      console.error('Erro ao buscar e-mail do produtor no Supabase Auth:', producerError)
    } else if (producerUser.user?.email) {
      const emailResult = await sendEventStatusEmail(
        producerUser.user.email,
        event.profiles?.name || 'Produtor',
        event.title,
        status,
        status === 'rejected' ? cleanReason : undefined,
        permanentRejection
      )

      notificationSent = emailResult.success
    }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/produtor/dashboard')
  revalidatePath('/')
  revalidatePath(`/evento/${eventId}`)

  return { success: true, notificationSent }
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
