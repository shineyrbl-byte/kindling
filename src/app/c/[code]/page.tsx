import CircleApp from "@/components/CircleApp";

export default async function CirclePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <CircleApp code={code.toUpperCase()} />;
}
