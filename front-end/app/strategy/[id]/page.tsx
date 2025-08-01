import { Navbar } from "@/components/navbar";
import { StrategyDetailClient } from "@/components/strategy-detail-client";

// Generate static params for the dynamic route
export async function generateStaticParams() {
  // Return the strategy IDs that should be pre-generated
  // For now, we'll generate pages for strategies 1, 2, and 3
  return [{ id: "1" }, { id: "2" }, { id: "3" }];
}

interface StrategyDetailProps {
  params: { id: string };
}

export default function StrategyDetail({ params }: StrategyDetailProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <StrategyDetailClient strategyId={params.id} />
    </div>
  );
}