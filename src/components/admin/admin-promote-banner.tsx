"use client";

import { useState } from "react";
import { Shield, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { bootstrapAdminAction } from "@/lib/actions/admin-actions";

export function AdminPromoteBanner() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handlePromote() {
    setStatus("loading");
    const result = await bootstrapAdminAction();
    if (result.ok) {
      setStatus("success");
      setMessage(result.message || "Promovido!");
      setTimeout(() => window.location.href = "/admin", 1500);
    } else {
      setStatus("error");
      setMessage(result.error || "Erro");
    }
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-heading font-semibold">Primeiro usuário?</h3>
            <p className="text-sm text-muted-foreground">
              Se você é o primeiro usuário do site e quer ser admin, clique aqui.
              Só funciona se não tiver nenhum admin cadastrado.
            </p>
          </div>
        </div>

        {status === "idle" && (
          <Button onClick={handlePromote} variant="outline" className="w-full">
            <Shield className="h-4 w-4 mr-2" />
            Promover minha conta para admin
          </Button>
        )}

        {status === "loading" && (
          <Button disabled className="w-full">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Promovendo...
          </Button>
        )}

        {status === "success" && (
          <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-md p-3">
            <AlertCircle className="h-4 w-4" />
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
