import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="relative">
          <div className="text-9xl font-heading font-bold text-primary/20">404</div>
          <BookOpen className="absolute inset-0 m-auto h-20 w-20 text-primary" />
        </div>
        <h1 className="font-heading text-3xl font-bold">
          Página perdida nas páginas
        </h1>
        <p className="text-muted-foreground">
          A página que você procura não tá aqui. Talvez ela tenha virado
          personagem de alguma LN. Volte e procure de novo.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild>
            <Link href="/">Voltar ao início</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explore">Explorar novels</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
