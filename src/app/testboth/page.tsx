import { EMDRProcessor } from '@/components/EMDRProcessor';
import EMDRSession from '@/components/EMDRSession';

export default function TestBothPage() {
  return (
    <main className="w-screen min-h-screen overflow-x-hidden bg-black">
      <div className="p-4">
        <h1 className="text-xl text-white mb-4">Testing Both Animations</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 p-4 rounded-lg">
            <h2 className="text-white mb-4">EMDRProcessor</h2>
            <div className="h-[50vh] overflow-hidden">
              <EMDRProcessor />
            </div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded-lg">
            <h2 className="text-white mb-4">EMDRSession with EMDRTarget</h2>
            <div className="h-[50vh] overflow-hidden">
              <EMDRSession
                initialSettings={{
                  speed: 1000,
                  freqLeft: 200,
                  freqRight: 200,
                  targetSize: 40,
                  visualIntensity: 0.8,
                  sessionDuration: 30,
                  oscillatorType: 'sine'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 