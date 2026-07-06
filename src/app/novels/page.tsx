import { redirect } from "next/navigation";

export default function NovelsIndexPage() {
  redirect("/explore?kind=novel");
}
