'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCategoriesAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Erro ao buscar categorias:', error)
    return { success: false, data: [] }
  }

  return { success: true, data: data || [] }
}

export async function createCategoryAction(name: string) {
  if (!name || !name.trim()) {
    return { success: false, error: 'O nome da categoria não pode ser vazio.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Não autorizado.' }
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return { success: false, error: 'Apenas administradores podem criar categorias.' }
  }

  const cleanName = name.trim()
  const slug = cleanName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: cleanName,
      slug,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Esta categoria já existe.' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/produtor/novo-evento')
  revalidatePath('/')
  return { success: true, category: data }
}

export async function deleteCategoryAction(categoryId: string) {
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

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return { success: false, error: 'Apenas administradores podem excluir categorias.' }
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/produtor/novo-evento')
  revalidatePath('/')
  return { success: true }
}
