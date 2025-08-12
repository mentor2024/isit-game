import Link from "next/link";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return (
    <main style={{padding: 24, fontFamily: "system-ui, sans-serif"}}>
      <h1>ISIT Game</h1>
      <p>Deployment check: ✅ site is up.</p>
      <p><Link href="/polls">Go to Polls</Link></p>
    </main>
  );
}
