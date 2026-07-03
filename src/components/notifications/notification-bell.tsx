"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellDot, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr.replace(" ", "T") + "Z").getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "agora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateStr.replace(" ", "T") + "Z").toLocaleDateString("pt-BR");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function notificationIcon(type: string) {
  switch (type) {
    case "new_chapter":
      return <BellDot className="h-4 w-4 text-blue-400" />;
    case "follow":
      return <Bell className="h-4 w-4 text-green-400" />;
    case "like":
      return <Bell className="h-4 w-4 text-red-400" />;
    case "comment":
      return <Bell className="h-4 w-4 text-amber-400" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        setNotifications(data.notifications.slice(0, 5));
        setUnreadCount(data.unread_count);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: 1 }))
        );
      }
    } catch {
      // silently fail
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label="Notificações"
        >
          {unreadCount > 0 ? (
            <BellDot className="h-5 w-5 text-primary" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-2 py-1 text-xs font-normal text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhuma notificação
          </div>
        ) : (
          notifications.map((notif) => (
            <DropdownMenuItem key={notif.id} asChild className="cursor-pointer">
              {notif.link ? (
                <Link
                  href={notif.link}
                  className={`flex items-start gap-3 px-3 py-2.5 ${!notif.is_read ? "bg-primary/5" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="mt-0.5 shrink-0">
                    {notificationIcon(notif.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                        {truncate(notif.body, 80)}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </Link>
              ) : (
                <div
                  className={`flex items-start gap-3 px-3 py-2.5 ${!notif.is_read ? "bg-primary/5" : ""}`}
                >
                  <span className="mt-0.5 shrink-0">
                    {notificationIcon(notif.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
                        {truncate(notif.body, 80)}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/notifications"
            className="flex items-center justify-center gap-1 text-sm font-medium text-primary"
            onClick={() => setOpen(false)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver todas
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
