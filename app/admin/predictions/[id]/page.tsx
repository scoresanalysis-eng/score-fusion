import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import PredictionEditClient from "./edit-client";

export default async function PredictionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();

  if (!session || !(session.user.isAdmin || session.user.role === "ADMIN")) {
    redirect("/");
  }

  const { id } = await params;

  const tip = await prisma.tip.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      shortName: true,
      league: true,
      country: true,
      externalId: true,
      sport: true,
      metadata: true,
    },
  });

  if (!tip) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <PredictionEditClient
          tip={{
            id: tip.id,
            title: tip.title,
            content: tip.content,
            summary: tip.summary || undefined,
            odds: tip.odds ? Number(tip.odds) : undefined,
            oddsSource: tip.oddsSource,
            sport: tip.sport,
            league: tip.league || undefined,
            matchDate: tip.matchDate ? tip.matchDate.toISOString() : undefined,
            homeTeam: tip.homeTeam
              ? {
                  id: tip.homeTeam.id,
                  name: tip.homeTeam.name,
                  logoUrl: tip.homeTeam.logoUrl || undefined,
                  shortName: tip.homeTeam.shortName || undefined,
                }
              : undefined,
            awayTeam: tip.awayTeam
              ? {
                  id: tip.awayTeam.id,
                  name: tip.awayTeam.name,
                  logoUrl: tip.awayTeam.logoUrl || undefined,
                  shortName: tip.awayTeam.shortName || undefined,
                }
              : undefined,
            predictionType: tip.predictionType || undefined,
            predictedOutcome: tip.predictedOutcome || undefined,
            confidenceLevel: tip.confidenceLevel || undefined,
            ticketSnapshots: tip.ticketSnapshots || [],
            isVIP: tip.isVIP,
            category: tip.category,
            featured: tip.featured,
            status: tip.status,
            result: tip.result || undefined,
            matchResult: tip.matchResult || undefined,
            createdAt: tip.createdAt.toISOString(),
            publishAt: tip.publishAt ? tip.publishAt.toISOString() : "",
            tags: tip.tags || [],
          }}
          teams={teams.map((team) => ({
            id: team.id,
            name: team.name,
            logoUrl: team.logoUrl || undefined,
            shortName: team.shortName || undefined,
            league: team.league || undefined,
            country: team.country || undefined,
            externalId: team.externalId || undefined,
            sport: team.sport?.name || undefined,
            metadata: team.metadata as Record<string, unknown> | undefined,
          }))}
        />
      </div>
    </div>
  );
}
