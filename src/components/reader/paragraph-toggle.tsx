"use client";

import { useState, useEffect } from "react";
import { MessageCircle, MessageCircleOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ParagraphToggle() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("tomoverso-paragraph-comments");
    if (stored === "hidden") {
      setVisible(false);
      document.documentElement.style.setProperty("--paragraph-comment-opacity", "0");
      document.documentElement.style.setProperty("--paragraph-comment-pointer", "none");
    } else {
      document.documentElement.style.setProperty("--paragraph-comment-opacity", "1");
      document.documentElement.style.setProperty("--paragraph-comment-pointer", "auto");
    }
  }, []);

  function toggle() {
    const newVisible = !visible;
    setVisible(newVisible);
    if (newVisible) {
      localStorage.setItem("tomoverso-paragraph-comments", "visible");
      document.documentElement.style.setProperty("--paragraph-comment-opacity", "1");
      document.documentElement.style.setProperty("--paragraph-comment-pointer", "auto");
    } else {
      localStorage.setItem("tomoverso-paragraph-comments", "hidden");
      document.documentElement.style.setProperty("--paragraph-comment-opacity", "0");
      document.documentElement.style.setProperty("--paragraph-comment-pointer", "none");
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="text-xs" title={visible ? "Ocultar comentários nos parágrafos" : "Mostrar comentários nos parágrafos"}>
      {visible ? (
        <><MessageCircle className="h-3.5 w-3.5 mr-1" /> Coments</>
      ) : (
        <><MessageCircleOff className="h-3.5 w-3.5 mr-1" /> Coments</>
      )}
    </Button>
  );
}
