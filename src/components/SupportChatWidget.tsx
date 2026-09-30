import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Msg = { id: string; direction: "visitor" | "operator" | "system"; text: string; created_at: string; read_by_visitor: boolean };
const TOKEN_KEY = "reage:support-token";
const TELEGRAM_URL = "https://t.me/reage_life";
const urlPattern = /(https?:\/\/[^\s]+)/g;

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
    try { const j = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data;
}

const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function dayKey(d: Date) {
  return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
}

function dayLabel(d: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((today - that) / 86400000);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  const base = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function MessageText({ text }: { text: string }) {
  return (
    <>
      {text.split(urlPattern).map((part, index) => part.startsWith("http://") || part.startsWith("https://") ? (
        <a key={`${part}-${index}`} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
          {part}
        </a>
      ) : <Fragment key={`${part}-${index}`}>{part}</Fragment>)}
    </>
  );
}

export function SupportChatWidget() {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasContact, setHasContact] = useState(true);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "+7 " });
  const [formErr, setFormErr] = useState("");
  const token = useRef(getToken());
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const openRef = useRef(chatOpen);
  openRef.current = chatOpen;

  const refresh = useCallback(async () => {
    try {
      const d = await call({ action: "history", token: token.current, markRead: openRef.current });
      setMsgs(d.messages || []);
      setHasContact(!!d.hasContact);
    } catch { /* keep the last successfully loaded history */ }
    finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => { if (!document.hidden) refresh(); }, chatOpen ? 4000 : 15000);
    const onVisibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [chatOpen, refresh]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs, chatOpen, hasContact]);

  useEffect(() => {
    if (chatOpen) {
      const id = window.setTimeout(() => textRef.current?.focus(), 150);
      return () => window.clearTimeout(id);
    }
  }, [chatOpen]);

  useEffect(() => {
    if (!launcherOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!launcherRef.current?.contains(event.target as Node)) setLauncherOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setLauncherOpen(false); fabRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [launcherOpen]);

  const unread = msgs.filter((m) => m.direction === "operator" && !m.read_by_visitor).length;
  const unreadLabel = unread > 99 ? "99+" : String(unread);
  const hasVisitorMsg = msgs.some((m) => m.direction === "visitor");
  const showForm = hasVisitorMsg && !hasContact;

  const openChat = () => {
    setLauncherOpen(false);
    setChatOpen(true);
    refresh();
  };

  const closeChat = () => {
    setChatOpen(false);
    window.setTimeout(() => fabRef.current?.focus(), 0);
  };

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true); setErr("");
    try {
      await call({ action: "send", token: token.current, text: t, page: window.location.href });
      setText("");
      await refresh();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Сообщение не отправилось"); }
    finally { setSending(false); }
  };

  const submitContact = async () => {
    setFormErr("");
    if (!form.name.trim()) return setFormErr("Укажите имя");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setFormErr("Проверьте адрес почты");
    const phone = form.phone.replace(/\D/g, "").length > 1 ? form.phone.trim() : undefined;
    try {
      await call({ action: "contact", token: token.current, name: form.name.trim(), email: form.email.trim(), phone });
      await refresh();
    } catch (e: unknown) { setFormErr(e instanceof Error ? e.message : "Не удалось сохранить контакты"); }
  };

  return (
    <>
      {!chatOpen && (
        <div ref={launcherRef} className="fixed bottom-5 right-4 z-50 sm:right-5">
          {launcherOpen && (
            <div className="support-chat-menu absolute bottom-[calc(100%+1rem)] right-0 flex w-[min(17rem,calc(100vw-2rem))] origin-bottom-right animate-enter flex-col items-end gap-2">
              <div className="mb-1 max-w-[17rem] rounded-2xl rounded-br-sm border border-border/70 bg-card/95 px-4 py-3 text-sm font-medium leading-relaxed text-foreground shadow-lg backdrop-blur-md">
                Здравствуйте! Выберите удобный способ связи.
              </div>
              <Button asChild className="support-telegram-btn !h-12 w-[15rem] justify-between rounded-xl px-3 shadow-lg">
                <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" onClick={() => setLauncherOpen(false)}>
                  <span className="font-semibold">Telegram</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-foreground/15">
                    <Send className="h-5 w-5" />
                  </span>
                </a>
              </Button>
              <Button className="!h-12 w-[15rem] justify-between rounded-xl px-3 shadow-lg" onClick={openChat}>
                <span className="font-semibold">Чат на сайте</span>
                <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/15">
                  <MessageCircle className="h-5 w-5" />
                  {unread > 0 && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-primary" />}
                </span>
              </Button>
            </div>
          )}
          <Button
            ref={fabRef}
            size="icon"
            onClick={() => setLauncherOpen((value) => !value)}
            aria-label={launcherOpen ? "Закрыть способы связи" : "Открыть способы связи"}
            aria-expanded={launcherOpen}
            className="support-chat-fab !h-16 !w-16 rounded-full shadow-xl transition-transform duration-200 hover:scale-105 [&_svg]:h-8 [&_svg]:w-8"
          >
            <span className={cn("transition-transform duration-200", launcherOpen && "rotate-90")}>
              {launcherOpen ? <X /> : <MessageCircle />}
            </span>
            {unread > 0 && (
              <span aria-label={`Новых сообщений: ${unread}`} aria-live="polite" className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold leading-none text-destructive-foreground ring-2 ring-background">
                {unreadLabel}
              </span>
            )}
          </Button>
        </div>
      )}

      {chatOpen && (
        <section role="dialog" aria-modal="true" aria-label="Чат поддержки ReAge" className="support-chat-panel fixed inset-0 z-50 flex flex-col bg-muted sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(560px,calc(100dvh-2.5rem))] sm:w-[380px] sm:rounded-lg sm:border sm:border-border sm:shadow-2xl">
          <header className="flex items-start justify-between border-b border-border bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:rounded-t-lg">
            <div>
              <h2 className="font-heading text-lg text-foreground">Вопрос в ReAge</h2>
              <p className="text-xs text-muted-foreground">Ответим здесь, а если вы уйдёте — на почту</p>
            </div>
            <Button variant="ghost" size="icon" onClick={closeChat} aria-label="Закрыть чат" className="h-9 w-9">
              <X className="h-5 w-5" />
            </Button>
          </header>

          <div ref={listRef} aria-live="polite" aria-busy={!loaded} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {!loaded && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span className="sr-only">Загружаем переписку</span>
              </div>
            )}
            {loaded && msgs.length === 0 && (
              <p className="mt-10 px-6 text-center text-sm text-muted-foreground">Напишите вопрос про анализы, отчёт или подписку</p>
            )}
            {msgs.map((m, i) => {
              const mDate = new Date(m.created_at);
              const showDay = i === 0 || dayKey(new Date(msgs[i - 1].created_at)) !== dayKey(mDate);
              return (
                <Fragment key={m.id}>
                  {showDay && (
                    <div className="flex justify-center py-1">
                      <span className="rounded-full bg-muted-foreground/10 px-3 py-1 text-[11px] font-medium text-muted-foreground">{dayLabel(mDate)}</span>
                    </div>
                  )}
                  {m.direction === "system" ? (
                    <p className="px-4 py-1 text-center text-xs text-muted-foreground">{m.text}</p>
                  ) : (
                    <div className={cn("flex", m.direction === "visitor" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", m.direction === "visitor" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card text-foreground")}>
                        <MessageText text={m.text} />
                        <div className={cn("mt-0.5 text-right text-[10px] leading-none", m.direction === "visitor" ? "text-primary-foreground/60" : "text-muted-foreground/70")}>
                          {timeLabel(m.created_at)}
                        </div>
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
            {showForm && (
              <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                <div className="font-heading text-base text-foreground">Представьтесь</div>
                <input aria-label="Имя" autoComplete="name" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input aria-label="Почта" autoComplete="email" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Почта" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input aria-label="Телефон" autoComplete="tel" inputMode="tel" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Телефон" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                {formErr && <p role="alert" className="text-xs text-destructive">{formErr}</p>}
                <Button onClick={submitContact} className="w-full">Отправить</Button>
              </div>
            )}
          </div>

          {err && (
            <div role="alert" className="flex items-center justify-between gap-2 px-4 pb-1 text-xs text-destructive">
              <span>{err}</span>
              <Button variant="ghost" size="sm" onClick={send} className="h-7 shrink-0 gap-1 text-destructive">
                <RotateCcw className="h-3.5 w-3.5" /> Повторить
              </Button>
            </div>
          )}
          <div className="flex items-end gap-2 border-t border-border bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:rounded-b-lg">
            <textarea
              ref={textRef}
              aria-label="Ваш вопрос"
              rows={1}
              value={text}
              onChange={(e) => { setText(e.target.value); if (err) setErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ваш вопрос…"
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <Button onClick={send} disabled={sending || !text.trim()} size="icon" aria-label={sending ? "Отправляем сообщение" : "Отправить сообщение"} className="h-10 w-10">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </section>
      )}
    </>
  );
}