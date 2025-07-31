import { Navbar } from '@/components/navbar';
import { GlobalSentimentBar } from '@/components/global-sentiment-bar';
import { SnapToBanner } from '@/components/snap-to-banner';
import { EventsCarousel } from '@/components/events-carousel';
import { StrategiesGrid } from '@/components/strategies-grid';
import { TokenCarousel } from '@/components/token-carousel';
import { VoicesSection } from '@/components/voices-section';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <GlobalSentimentBar />
      <SnapToBanner />
      
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Live Events Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Live Market Events</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Real-time</span>
            </div>
          </div>
          <EventsCarousel />
        </section>

        {/* Active Strategies */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Active Strategies</h2>
            <span className="text-sm text-gray-600">14.1k projects tracked</span>
          </div>
          <StrategiesGrid />
        </section>

        {/* Token Sentiment */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Token Sentiment</h2>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">Good sentiment</button>
              <button className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full">Bad sentiment</button>
            </div>
          </div>
          <TokenCarousel />
        </section>

        {/* Voices Section */}
        <VoicesSection />
      </main>
    </div>
  );
}