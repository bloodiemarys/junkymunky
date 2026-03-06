"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type MessageRow = {
  id: string;
  job_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

type Participant = { id: string; label: string };

export function JobMessages({
  jobId,
  viewerId,
  defaultRecipientId,
  participants,
}: {
  jobId: string;
  viewerId: string;
  defaultRecipientId: string | null;
  participants: Participant[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [recipientId, setRecipientId] = useState<string | null>(defaultRecipientId);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const { data, error } = await supabase
        .from("messages")
        .select("id,job_id,sender_id,recipient_id,body,created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!ignore) {
        if (error) toast.error(error.message);
        setMessages((data ?? []) as MessageRow[]);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [jobId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`job-messages:${jobId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `job_id=eq.${jobId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (!recipientId) {
      toast.error("Messaging is available after you have a participant to message.");
      return;
    }
    if (body.length < 1) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        job_id: jobId,
        sender_id: viewerId,
        recipient_id: recipientId,
        body,
      });
      if (error) throw error;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const transcript = messages.filter(
    (m) =>
      (m.sender_id === viewerId && m.recipient_id === recipientId) ||
      (m.sender_id === recipientId && m.recipient_id === viewerId)
  );

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Conversation</label>
        <select
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          value={recipientId ?? ""}
          onChange={(e) => setRecipientId(e.target.value || null)}
          disabled={participants.length === 0}
        >
          {participants.length === 0 ? <option value="">No participants</option> : null}
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="max-h-[420px] overflow-auto rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        {recipientId ? (
          transcript.length ? (
            <div className="grid gap-2">
              {transcript.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.sender_id === viewerId
                      ? "ml-auto max-w-[85%] rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : "mr-auto max-w-[85%] rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50"
                  }
                >
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className="mt-1 text-[11px] opacity-70">
                    {new Date(m.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No messages yet.</p>
          )
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No messaging recipient available yet.
          </p>
        )}
      </div>

      <form action={send} className="grid gap-2">
        <Textarea name="body" placeholder="Write a message…" />
        <Button type="submit" disabled={sending || !recipientId}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}

