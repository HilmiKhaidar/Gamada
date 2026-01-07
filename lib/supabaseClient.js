import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions untuk auth
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper functions untuk profiles
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

// Helper functions untuk CRUD operations
export const insertData = async (table, data, userId) => {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single()

  if (!error && result) {
    // Log ke histori_update
    await supabase.from('histori_update').insert({
      user_id: userId,
      table_name: table,
      action: 'INSERT',
      record_id: result.id
    })
  }

  return { data: result, error }
}

export const updateData = async (table, id, data, userId) => {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (!error && result) {
    // Log ke histori_update
    await supabase.from('histori_update').insert({
      user_id: userId,
      table_name: table,
      action: 'UPDATE',
      record_id: id
    })
  }

  return { data: result, error }
}

export const deactivateData = async (table, id, userId) => {
  const { data: result, error } = await supabase
    .from(table)
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (!error && result) {
    // Log ke histori_update
    await supabase.from('histori_update').insert({
      user_id: userId,
      table_name: table,
      action: 'DEACTIVATE',
      record_id: id
    })
  }

  return { data: result, error }
}

export const fetchData = async (table, filters = {}) => {
  let query = supabase.from(table).select('*')
  
  // Apply filters
  Object.keys(filters).forEach(key => {
    query = query.eq(key, filters[key])
  })
  
  const { data, error } = await query.order('created_at', { ascending: false })
  return { data, error }
}