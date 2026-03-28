import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          AtmosNet Dashboard
        </h1>
        
        <p className="text-center mb-8 text-gray-600">
          Hyperlocal weather intelligence network administration
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Link 
            href="/observations"
            className="p-6 border rounded-lg hover:border-primary-500 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Observations</h2>
            <p className="text-gray-600">View and manage weather observations</p>
          </Link>
          
          <Link 
            href="/network"
            className="p-6 border rounded-lg hover:border-primary-500 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Network</h2>
            <p className="text-gray-600">Coverage map and device metrics</p>
          </Link>
          
          <Link 
            href="/api-keys"
            className="p-6 border rounded-lg hover:border-primary-500 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">API Keys</h2>
            <p className="text-gray-600">Manage enterprise API access</p>
          </Link>
        </div>
      </div>
    </main>
  )
}
