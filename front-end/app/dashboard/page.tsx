'use client';

import { Navbar } from '@/components/navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrategiesGrid } from '@/components/strategies-grid';
import { VoicesSection } from '@/components/voices-section';
import { TokenCarousel } from '@/components/token-carousel';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your event-triggered limit order strategies</p>
        </div>

        <Tabs defaultValue="projects" className="space-y-8">
          <TabsList className="bg-white border border-gray-200">
            <TabsTrigger value="projects" className="font-medium">
              Projects
            </TabsTrigger>
            <TabsTrigger value="voices" className="font-medium">
              Voices
            </TabsTrigger>
            <TabsTrigger value="pools" className="font-medium">
              Pools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-8">
            <StrategiesGrid />
          </TabsContent>

          <TabsContent value="voices" className="space-y-8">
            <VoicesSection />
          </TabsContent>

          <TabsContent value="pools" className="space-y-8">
            <TokenCarousel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}