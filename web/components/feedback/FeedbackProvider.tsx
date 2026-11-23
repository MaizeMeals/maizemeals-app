"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, Heart, Lightbulb, Loader2, MessageSquare } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { submitFeedback, type FeedbackKind, type FeedbackSource } from "@/app/actions/feedback";
import { createClient } from "@/lib/supabase/client";
import { useAnalytics } from "@/hooks/use-analytics";
import { isStandaloneDisplay } from "@/lib/pwa";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

type FeedbackContextValue = { openFeedback: (source?: FeedbackSource) => void };
const FeedbackContext = createContext<FeedbackContextValue>({ openFeedback: () => {} });

/** Open the feedback form from anywhere (footer, settings, the prompt). */
export function useFeedback() {
  return useContext(FeedbackContext);
}

const KINDS: { id: FeedbackKind; label: string; icon: typeof Lightbulb; placeholder: string }[] = [
  { id: "idea", label: "Idea", icon: Lightbulb, placeholder: "What would make MaizeMeals better for you?" },
  { id: "bug", label: "Something's broken", icon: Bug, placeholder: "What happened, and on which page?" },
  { id: "praise", label: "Love it", icon: Heart, placeholder: "What do you like? It helps us know what to keep." },
  { id: "other", label: "Other", icon: MessageSquare, placeholder: "What's on your mind?" },
];

// Retention prompt: returning visitors only, rarely, never after they've written in.
const VISITS_KEY = "mm_visit_count"; // counted once per session by InstallPrompt
const FIRST_SEEN_KEY = "mm_first_seen_at";
const PROMPTED_KEY = "mm_feedback_prompted_at";
const SENT_KEY = "mm_feedback_sent_at";
const SESSION_KEY = "mm_feedback_prompt_session";
const MIN_VISITS = 4;
const MIN_DAYS_SINCE_FIRST = 3;
const PROMPT_EVERY_DAYS = 30;
const QUIET_AFTER_SENT_DAYS = 90;
const DELAY_MS = 25_000;
const NO_PROMPT = [/^\/admin/, /^\/login/, /^\/signup/, /^\/auth/, /^\/settings/];
const DAY = 86_400_000;

function read(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}
function write(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // storage blocked: the prompt just won't be remembered
  }
}

function FeedbackDialog({
  open,
  source,
  onOpenChange,
}: {
  open: boolean;
  source: FeedbackSource;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname() ?? "/";
  const { track } = useAnalytics();
  const [kind, setKind] = useState<FeedbackKind>("idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(Boolean(data.session?.user));
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const reset = () => {
    setKind("idea");
    setMessage("");
    setEmail("");
    setWebsite("");
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const result = await submitFeedback({
        kind,
        message,
        contactEmail: signedIn ? undefined : email,
        pagePath: pathname,
        isInstalled: isStandaloneDisplay(),
        source,
        website,
      }).catch(() => ({ success: false as const, error: "Couldn't send that. Please try again." }));
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      write(localStorage, SENT_KEY, String(Date.now()));
      track("feedback_submitted", { kind, source, signed_in: Boolean(signedIn) });
      toast.success("Thanks! We read every message.");
      reset();
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  const active = KINDS.find((k) => k.id === kind) ?? KINDS[0];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Send feedback</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Ideas, bugs, or just what you think. Two students read every message.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={send} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody className="flex flex-col gap-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-foreground">What kind of feedback?</legend>
              <div className="grid grid-cols-2 gap-2">
                {KINDS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={kind === id}
                    onClick={() => setKind(id)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium transition-colors",
                      kind === id
                        ? "border-umich-blue bg-umich-blue/5 text-foreground ring-1 ring-umich-blue dark:border-maize dark:bg-maize/10 dark:ring-maize"
                        : "border-border text-foreground/80 hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="feedback-message" className="text-sm font-medium text-foreground">
                Your message
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={active.placeholder}
                rows={5}
                maxLength={2000}
                required
                className="mt-2 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {signedIn === false ? (
              <div>
                <label htmlFor="feedback-email" className="text-sm font-medium text-foreground">
                  Email <span className="font-normal text-muted-foreground">(optional, if you want a reply)</span>
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@umich.edu"
                  className="mt-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            ) : signedIn ? (
              <p className="text-xs text-muted-foreground">Sent from your account, so we can reply if needed.</p>
            ) : null}

            {/* Spam trap: hidden from people, tempting to bots. */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute left-[-9999px] h-px w-px opacity-0"
            />
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button
              type="submit"
              disabled={sending || message.trim().length < 3}
              className={cn("w-full gap-2", appPrimaryButtonClassName)}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {sending ? "Sending…" : "Send feedback"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * Feedback form for everyone (guests too) plus a gentle prompt for people who
 * keep coming back: at least 4 visits over 3+ days, at most once a month, and
 * never within 90 days of sending feedback.
 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { track } = useAnalytics();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<FeedbackSource>("link");
  const promptedRef = useRef(false);

  const openFeedback = useCallback((from: FeedbackSource = "link") => {
    setSource(from);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!read(localStorage, FIRST_SEEN_KEY)) write(localStorage, FIRST_SEEN_KEY, String(Date.now()));
  }, []);

  useEffect(() => {
    if (promptedRef.current || NO_PROMPT.some((re) => re.test(pathname))) return;
    const now = Date.now();
    const visits = Number(read(localStorage, VISITS_KEY) ?? "0");
    const firstSeen = Number(read(localStorage, FIRST_SEEN_KEY) ?? now);
    const prompted = Number(read(localStorage, PROMPTED_KEY) ?? "0");
    const sent = Number(read(localStorage, SENT_KEY) ?? "0");
    const eligible =
      visits >= MIN_VISITS &&
      now - firstSeen >= MIN_DAYS_SINCE_FIRST * DAY &&
      now - prompted >= PROMPT_EVERY_DAYS * DAY &&
      now - sent >= QUIET_AFTER_SENT_DAYS * DAY &&
      !read(sessionStorage, SESSION_KEY);
    if (!eligible) return;

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      promptedRef.current = true;
      write(localStorage, PROMPTED_KEY, String(Date.now()));
      write(sessionStorage, SESSION_KEY, "1");
      track("feedback_prompt_shown", { visits });
      toast("Enjoying MaizeMeals?", {
        description: "Got an idea or found something broken? We'd love to hear from you.",
        duration: 15_000,
        action: {
          label: "Share feedback",
          onClick: () => {
            track("feedback_prompt_clicked");
            openFeedback("prompt");
          },
        },
      });
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, openFeedback, track]);

  return (
    <FeedbackContext.Provider value={{ openFeedback }}>
      {children}
      <FeedbackDialog open={open} source={source} onOpenChange={setOpen} />
    </FeedbackContext.Provider>
  );
}

/** A plain link-style button that opens the form (for server components). */
export function FeedbackLink({
  className,
  source = "link",
  children = "Send feedback",
}: {
  className?: string;
  source?: FeedbackSource;
  children?: React.ReactNode;
}) {
  const { openFeedback } = useFeedback();
  return (
    <button type="button" onClick={() => openFeedback(source)} className={className}>
      {children}
    </button>
  );
}
