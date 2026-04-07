import { TranscriptionEditClient } from "@/components/transcription-edit-client";

export default async function TranscriptionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TranscriptionEditClient id={id} />;
}
