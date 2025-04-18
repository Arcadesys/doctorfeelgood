import { EMDRProcessor } from '@/components/EMDRProcessor';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <h1 className="text-2xl font-bold mb-4 text-white">EMDR Processing</h1>
      <EMDRProcessor />
    </main>
  );
}
