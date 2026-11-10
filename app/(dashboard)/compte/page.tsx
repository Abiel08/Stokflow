import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ChangePasswordClient from "@/components/account/ChangePasswordClient"

export default async function ComptePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <ChangePasswordClient
      userName={session.user.name ?? ""}
      username={(session.user as any).username ?? ""}
    />
  )
}
