"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellDot,
  CheckCheck,
  ExternalLink,
  Heart,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

  if (diffSec < 60) return "agora mesmo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `há ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `há ${diffDay} d`;
  if (diffDay < 30) return `há ${Math.floor(diffDay / 7)} sem`;
  if (diffDay < 365) return `há ${Math.floor(diffDay / 30)} mes${Math.floor(diffDay / 30) > 1 ? "es" : ""}`;
  return new Date(dateStr.replace(" ", "T") + "Z").toLocaleDateString("pt-BR");
}

function typeIcon(type: string) {
  switch (type) {
    case "new_chapter":
      return <BellDot className="h-5 w-5 text-blue-400" />;
    case "follow":
      return <UserPlus className="h-5 w-5 text-green-400" />;
    case "like":
      return <Heart className="h-5 w-5 text-red-400" />;
    case "comment":
      return <MessageCircle className="h-5 w-5 text-amber-400" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
}

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        setNotifications(data.notifications);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
        );
      }
    } catch {
      // silently fail
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: 1 }))
        );
      }
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div>
      {notifications.length > 0 && hasUnread && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={markAllAsRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card/30 px-6 py-16 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-lg font-semibold">Nenhuma notificação</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Você será notificado quando houver novos capítulos, seguidores e
              interações.
            </p>
          </div>
          <Button asChild className="mt-2 rounded-full">
            <Link href="/explore">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Explorar novels
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`group flex items-start gap-4 rounded-2xl border border-border/50 p-4 transition-colors ${
                notif.is_read
                  ? "bg-card/30"
                  : "bg-primary/5 ring-1 ring-primary/10"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {typeIcon(notif.type)}
              </span>
              <div className="min-w-0 flex-1">
                {notif.link ? (
                  <Link
                    href={notif.link}
                    className="text-sm font-semibold hover:text-primary"
                  >
                    {notif.title}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold">{notif.title}</p>
                )}
                {notif.body && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {notif.body}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {timeAgo(notif.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {!notif.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Marcar como lida"
                    onClick={() => markAsRead(notif.id)}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
