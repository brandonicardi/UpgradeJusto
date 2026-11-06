import PCs from "./pcs";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ nueva?: string | string[] }> }) {
  const { nueva } = await searchParams;
  return <PCs nueva={nueva === "1"} />;
}
