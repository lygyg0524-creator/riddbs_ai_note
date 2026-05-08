import { supabase } from '../lib/supabase'

function mapNote(n) {
  const { summary_length, ...rest } = n
  return { ...rest, summaryLength: summary_length }
}

export async function saveNote({ title, content, summary = null, summaryLength = null, keywords = [] }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: user.id, title, content, summary, summary_length: summaryLength, keywords, versions: [] })
    .select('*')
    .single()
  if (error) throw error
  return mapNote(data)
}

export async function updateNote(id, { title, content, summary, summaryLength, keywords }) {
  const { data: existing, error: fetchErr } = await supabase
    .from('notes')
    .select('content, summary, updated_at, versions')
    .eq('id', id)
    .single()
  if (fetchErr) throw fetchErr

  const versions = [
    { content: existing.content, summary: existing.summary, savedAt: existing.updated_at },
    ...(existing.versions ?? []),
  ].slice(0, 10)

  const { error } = await supabase
    .from('notes')
    .update({ title, content, summary, summary_length: summaryLength, keywords, versions, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function getAllNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data.map(mapNote)
}

export async function deleteNote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

export async function updateNoteSummary(id, { summary, summaryLength, keywords }) {
  const { error } = await supabase
    .from('notes')
    .update({ summary, summary_length: summaryLength, keywords, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function importNotes(notes) {
  const { data: { user } } = await supabase.auth.getUser()
  const rows = notes.map(({ summaryLength, summary_length, ...rest }) => ({
    ...rest,
    summary_length: summaryLength ?? summary_length ?? null,
    user_id: user.id,
  }))
  const { error } = await supabase.from('notes').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}
