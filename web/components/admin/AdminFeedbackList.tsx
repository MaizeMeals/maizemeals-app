"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Bug, Heart, Lightbulb, MessageSquare, Smartphone } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { adminSaveFeedbackNote, adminSetFeedbackStatus } from "@/app/actions/admin";
import type { AdminFeedback, FeedbackStatus } from "@/lib/admin/feedback";
import { cn } from "@/lib/utils";

const KIND: Record<string, { label: string; icon: typeof Bug; cls: string }> = {
  idea: { label: "Idea", icon: Lightbulb, cls: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30" },
  bug: { label: "Bug", icon: Bug, cls: "bg-red-50 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
  praise: { label: "Praise", icon: Heart, cls: "bg-green-50 text-green-900 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30" },
  other: { label: "Other", icon: MessageSquare, cls: "bg-muted text-foreground border-border" },
};

const NEXT: { status: FeedbackStatus; label: string }[] = [
  { status: "read", label: "Mark read" },
  { status: "done", label: "Done" },
  { status: "archived", label: "Archive" },
  { status: "new", label: "Mark new" },
];

function FeedbackCard({ item }: { item: AdminFeedback }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState(item.adminNote ?? "");
  const [status, setStatus] = useState(item.status);
  const kind = KIND[item.kind] ?? KIND.other;
  const Icon = kind.icon;

  const move = (next: FeedbackStatus) =>
    start(async () => {
      const res = await adminSetFeedbackStatus(item.id, next);
      if (res.success) setStatus(next);
      else toast.error(res.error);
    });

  const saveNote = () =>
    start(async () => {
      const res = await adminSaveFeedbackNote(item.id, note);
      if (res.success) toast.success("Note saved");
      else toast.error(res.error);
    });

  const sender = item.user
    ? item.user.name || item.user.email || "Signed-in user"
    : item.contactEmail
      ? `Guest · ${item.contactEmail}`
      : "Guest (no email)";

  return (
    <li className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", status === "new" && "border-l-4 border-l-maize")}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold", kind.cls)}>
          <Icon className="h-3.5 w-3.5" aria-hidden /> {kind.label}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 font-medium capitalize text-muted-foreground">{status}</span>
        <span className="text-muted-foreground">{formatDistanceToNowStrict(new Date(item.createdAt))} ago</span>
        {item.source === "prompt" ? <span className="text-muted-foreground">· from the prompt</span> : null}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.message}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          From:{" "}
          {item.user ? (
            <Link href={`/admin/users/${item.user.id}`} className="font-medium text-foreground hover:underline">
              {sender}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{sender}</span>
          )}
          {item.user?.email && item.user.name ? ` (${item.user.email})` : ""}
        </span>
        {item.pagePath ? (
          <span>
            Page:{" "}
            <Link href={item.pagePath} className="font-mono text-foreground hover:underline">
              {item.pagePath}
            </Link>
          </span>
        ) : null}
        {item.device ? (
          <span className="inline-flex items-center gap-1">
            <Smartphone className="h-3 w-3" aria-hidden />
            {item.device}
            {item.isInstalled ? " · installed app" : ""}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <label className="sr-only" htmlFor={`note-${item.id}`}>
          Private note
        </label>
        <textarea
          id={`note-${item.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={1}
          placeholder="Private note (what we did, who's on it)"
          className="min-h-9 flex-1 resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
        <Button type="button" variant="outline" size="sm" disabled={pending || note === (item.adminNote ?? "")} onClick={saveNote}>
          Save note
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {NEXT.filter((n) => n.status !== status).map((n) => (
          <Button key={n.status} type="button" variant="ghost" size="sm" disabled={pending} onClick={() => move(n.status)}>
            {n.label}
          </Button>
        ))}
        {item.user?.email || item.contactEmail ? (
          <Button asChild type="button" variant="ghost" size="sm">
            <a href={`mailto:${item.user?.email ?? item.contactEmail}?subject=${encodeURIComponent("About your MaizeMeals feedback")}`}>
              Reply by email
            </a>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function AdminFeedbackList({ items }: { items: AdminFeedback[] }) {
  if (items.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">Nothing here.</p>;
  }
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {items.map((item) => (
        <FeedbackCard key={item.id} item={item} />
      ))}
    </ul>
  );
}
