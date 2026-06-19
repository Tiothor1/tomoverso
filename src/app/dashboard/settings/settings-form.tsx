"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { updateProfileAction } from "@/lib/actions/settings-actions";

interface SettingsFormProps {
  user: {
    id: string;
    username: string;
    email: string;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
    role: string;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await updateProfileAction(formData);
    if (result) {
      setMessage({ ok: result.ok, text: result.message || result.error || "" });
      if (result.ok) router.refresh();
    }
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {user.display_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.display_name}</div>
              <div className="text-sm text-muted-foreground">@{user.username}</div>
              <div className="flex gap-2 mt-1">
                {user.role === "admin" && <Badge variant="destructive" className="text-[10px]">Admin</Badge>}
                {user.role === "author" && <Badge variant="default" className="text-[10px]">Autor</Badge>}
                {user.role === "user" && <Badge variant="secondary" className="text-[10px]">Leitor</Badge>}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="display_name">Nome de exibição</Label>
            <Input
              id="display_name"
              name="display_name"
              defaultValue={user.display_name}
              required
              minLength={2}
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={user.bio || ""}
              rows={4}
              maxLength={500}
              placeholder="Conte um pouco sobre você..."
            />
            <p className="text-xs text-muted-foreground">Máximo 500 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar_url">URL do avatar (opcional)</Label>
            <Input
              id="avatar_url"
              name="avatar_url"
              type="url"
              defaultValue={user.avatar_url || ""}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Username (não pode ser alterado)</Label>
            <Input value={user.username} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>Email (não pode ser alterado)</Label>
            <Input value={user.email} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      {message && (
        <div className={`text-sm rounded-md p-3 ${
          message.ok
            ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/30"
            : "text-red-500 bg-red-500/10 border border-red-500/30"
        }`}>
          {message.text}
        </div>
      )}

      <div className="sticky bottom-4 bg-background/80 backdrop-blur-md p-4 rounded-lg border border-border/40 -mx-4 px-4">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar alterações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
