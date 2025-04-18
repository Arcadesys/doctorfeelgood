import { EMDRProcessor } from '@/components/EMDRProcessor';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <h1 className="text-2xl font-bold mb-4 text-white">EMDR Processing</h1>
      
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Link 
          href="/panner" 
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md text-center"
        >
          Simple Audio Panner ➡️
        </Link>
      </div>
      
      <EMDRProcessor />
    </main>
  );
}
