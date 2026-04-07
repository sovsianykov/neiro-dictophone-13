import { ContinueRecordingClient } from "@/components/continue-recording-client";

export default async function ContinueRecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContinueRecordingClient id={id} />;
}
