import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Msg = { id: string; direction: "visitor" | "operator" | "system"; text: string; created_at: string; read_by_visitor: boolean };
const TOKEN_KEY = "reage:support-token";

function getToken() {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get("newchat") === "1") localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) { t = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8); localStorage.setItem(TOKEN_KEY, t); }
  return t;
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("support-chat", { body });
  if (error) {
    let msg = "Сообщение не отправилось. Проверьте соединение и повторите";
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data;
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [hasContact, setHasContact] = useState(true);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "+7 " });
  const [formErr, setFormErr] = useState("");
  const token = useRef(getToken());
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const refresh = useCallback(async () => {
    try {
      const d = await call({ action: "history", token: token.current, markRead: openRef.current });
      setMsgs(d.messages || []);
      setHasContact(!!d.hasContact);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => { if (!document.hidden) refresh(); }, open ? 4000 : 15000);
    return () => clearInterval(id);
  }, [open, refresh]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs, open, hasContact]);

  const unread = msgs.filter((m) => m.direction === "operator" && !m.read_by_visitor).length;
  const hasVisitorMsg = msgs.some((m) => m.direction === "visitor");
  const showForm = hasVisitorMsg && !hasContact;

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true); setErr("");
    try {
      await call({ action: "send", token: token.current, text: t, page: window.location.href });
      setText("");
      await refresh();
    } catch (e: any) { setErr(e.message); }
    setSending(false);
  };

  const submitContact = async () => {
    setFormErr("");
    if (!form.name.trim()) return setFormErr("Укажите имя");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setFormErr("Проверьте адрес почты");
    const phone = form.phone.replace(/\D/g, "").length > 1 ? form.phone.trim() : undefined;
    try {
      await call({ action: "contact", token: token.current, name: form.name.trim(), email: form.email.trim(), phone });
      await refresh();
    } catch (e: any) { setFormErr(e.message); }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Открыть чат поддержки"
          className="support-chat-fab animate-fade-in fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:scale-110"
        >
          <MessageCircle className="h-8 w-8" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-muted sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[560px] sm:w-[380px] sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl">
          <div className="flex items-start justify-between border-b border-border bg-card px-4 py-3 sm:rounded-t-2xl">
            <div>
              <div className="font-heading text-lg text-foreground">Вопрос в Reage</div>
              <div className="text-xs text-muted-foreground">Ответим здесь и продублируем на почту</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Закрыть чат" className="rounded-md p-1 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {msgs.length === 0 && (
              <p className="mt-10 px-6 text-center text-sm text-muted-foreground">Напишите вопрос про анализы, отчёт или подписку</p>
            )}
            {msgs.map((m) =>
              m.direction === "system" ? (
                <p key={m.id} className="px-4 py-1 text-center text-xs text-muted-foreground">{m.text}</p>
              ) : (
                <div key={m.id} className={cn("flex", m.direction === "visitor" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
                      m.direction === "visitor" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card text-foreground",
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ),
            )}
            {showForm && (
              <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
                <div className="font-heading text-base text-foreground">Представьтесь</div>
                <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Почта" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Телефон" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                {formErr && <p className="text-xs text-destructive">{formErr}</p>}
                <button onClick={submitContact} className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground">Отправить</button>
              </div>
            )}
          </div>

          {err && <p className="px-4 pb-1 text-xs text-destructive">{err}</p>}
          <div className="flex items-end gap-2 border-t border-border bg-card p-3 sm:rounded-b-2xl">
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ваш вопрос…"
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <button onClick={send} disabled={sending || !text.trim()} aria-label="Отправить" className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
