import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";
import { CLIAuthContent } from "./CLIAuthContent";

export default async function CLIAuthPage({
  searchParams,
}: {
  searchParams: { state?: string; port?: string };
}) {
  const session = await auth();

  // If not logged in, redirect to login
  if (!session) {
    redirect(`/login?callbackUrl=/cli-auth?state=${searchParams.state}&port=${searchParams.port}`);
  }

  return <CLIAuthContent state={searchParams.state} port={searchParams.port} />;
}
