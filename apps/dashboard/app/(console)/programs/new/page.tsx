import { redirect } from "next/navigation";

export default function NewProgramPage() {
  redirect("/programs?add=1");
}
