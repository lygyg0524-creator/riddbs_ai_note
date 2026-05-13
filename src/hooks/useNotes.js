import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function mapNote(n) {
  const { summary_length, ...rest } = n
  return { ...rest, summaryLength: summary_length }
}

export function useNotes(userId) {
  const [notes, setNotes] = useState(null)

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })
    setNotes(data?.map(mapNote) ?? [])
  }, [])

  useEffect(() => {
    if (!userId) {
      setNotes([])
      return
    }

    fetchNotes()

    const channel = supabase
      .channel('notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchNotes)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  return { notes, refetch: fetchNotes }
}
