"use server";

import { getCurrentUserFamily } from "@/lib/families/queries";
import { contentForKind, normalizeChecklistItems } from "@/lib/notes/content";
import { canChangeNoteScope } from "@/lib/notes/permissions";
import type { NoteContent, NoteKind, NoteUiPrefs } from "@/lib/notes/types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type NotesActionResult = { ok: true } | { ok: false; error: string };
export type CreateNoteInput = {
  title: string;
  kind: NoteKind;
  content: NoteContent;
};

function revalidateNotes() {
  revalidatePath("/notes");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      supabase,
      user: null as null,
      error: { ok: false as const, error: "Sessione assente." },
    };
  }
  return { supabase, user, error: null };
}

export async function createNote(
  input?: CreateNoteInput,
): Promise<NotesActionResult & { id?: string }> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) {
    return error ?? { ok: false, error: "Sessione assente." };
  }

  const title = input?.title ?? "";
  const kind = input?.kind ?? "text";
  const content = input?.content ?? { body: "" };

  if (title.length > 200) {
    return { ok: false, error: "Il titolo è troppo lungo." };
  }

  const { data, error: insertError } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      scope: "personal",
      family_id: null,
      title,
      kind,
      content: payloadForKind(kind, content),
    })
    .select("id")
    .single();

  if (insertError || !data) {
    return {
      ok: false,
      error: insertError?.message ?? "Impossibile creare la nota.",
    };
  }

  revalidateNotes();
  return { ok: true, id: data.id };
}

function payloadForKind(kind: NoteKind, content: NoteContent): NoteContent {
  const converted = contentForKind(kind, content);
  if (kind === "checklist" && "items" in converted) {
    return { items: normalizeChecklistItems(converted.items) };
  }
  return converted;
}

export async function updateNoteContent(input: {
  id: string;
  title: string;
  kind: NoteKind;
  content: NoteContent;
}): Promise<NotesActionResult> {
  const { supabase, error } = await requireUser();
  if (error) {
    return error;
  }

  if (input.kind !== "text" && input.kind !== "checklist") {
    return { ok: false, error: "Tipo nota non valido." };
  }

  if (input.title.length > 200) {
    return { ok: false, error: "Il titolo è troppo lungo." };
  }

  const content = payloadForKind(input.kind, input.content);

  const { error: updateError } = await supabase
    .from("notes")
    .update({
      title: input.title,
      kind: input.kind,
      content,
    })
    .eq("id", input.id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidateNotes();
  return { ok: true };
}

export async function shareNote(id: string): Promise<NotesActionResult> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) {
    return error ?? { ok: false, error: "Sessione assente." };
  }

  const family = await getCurrentUserFamily();
  if (!family) {
    return { ok: false, error: "Serve una famiglia per condividere." };
  }

  const { data: existing, error: loadError } = await supabase
    .from("notes")
    .select("user_id, scope")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, error: loadError?.message ?? "Nota non trovata." };
  }

  if (!canChangeNoteScope(user.id, { user_id: existing.user_id })) {
    return { ok: false, error: "Solo chi ha creato la nota può condividerla." };
  }

  if (existing.scope === "family") {
    return { ok: true };
  }

  const { error: updateError } = await supabase
    .from("notes")
    .update({ scope: "family", family_id: family.family_id })
    .eq("id", id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidateNotes();
  return { ok: true };
}

export async function unshareNote(id: string): Promise<NotesActionResult> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) {
    return error ?? { ok: false, error: "Sessione assente." };
  }

  const { data: existing, error: loadError } = await supabase
    .from("notes")
    .select("user_id, scope")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, error: loadError?.message ?? "Nota non trovata." };
  }

  if (!canChangeNoteScope(user.id, { user_id: existing.user_id })) {
    return {
      ok: false,
      error: "Solo chi ha creato la nota può togliere la condivisione.",
    };
  }

  const { error: updateError } = await supabase
    .from("notes")
    .update({ scope: "personal", family_id: null })
    .eq("id", id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidateNotes();
  return { ok: true };
}

export async function deleteNote(id: string): Promise<NotesActionResult> {
  const { supabase, error } = await requireUser();
  if (error) {
    return error;
  }

  const { error: deleteError } = await supabase
    .from("notes")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  revalidateNotes();
  return { ok: true };
}

export async function saveNoteUiPrefs(
  prefs: NoteUiPrefs,
): Promise<NotesActionResult> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) {
    return error ?? { ok: false, error: "Sessione assente." };
  }

  const { error: upsertError } = await supabase.from("note_ui_prefs").upsert({
    user_id: user.id,
    personal_section_collapsed: prefs.personal_section_collapsed,
    family_section_collapsed: prefs.family_section_collapsed,
    collapsed_note_ids: prefs.collapsed_note_ids,
  });

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  revalidateNotes();
  return { ok: true };
}
