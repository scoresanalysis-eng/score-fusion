"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PredictionForm } from "../_components/prediction-form.jsx";
import type {
  PredictionFormPayload,
  PredictionFormValues,
  Team,
  Tip,
} from "../_components/prediction-form-types";

type PredictionSubmission = {
  manualMode?: boolean;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamLogoUrl?: string;
  awayTeamLogoUrl?: string;
  sport: string;
  league?: string;
  homeTeamId?: string;
  awayTeamId?: string;
};

function serializePayload(payload: PredictionFormPayload) {
  return {
    title: payload.title,
    content: payload.content || payload.summary,
    summary: payload.summary,
    odds: payload.odds,
    oddsSource: payload.oddsSource,
    sport: payload.sport,
    league: payload.league,
    matchDate: payload.matchDate || undefined,
    homeTeamId: payload.homeTeamId,
    awayTeamId: payload.awayTeamId,
    predictionType: payload.predictionType,
    predictedOutcome: payload.predictedOutcome,
    ticketSnapshots: payload.ticketSnapshots,
    isVIP: payload.isVIP,
    category: payload.category,
    featured: payload.featured,
    status: payload.status,
    publishAt: payload.publishAt || undefined,
    tags: payload.tags,
    confidenceLevel: payload.confidenceLevel,
    result: payload.result,
    matchResult: payload.matchResult,
  };
}

export default function PredictionEditClient({
  tip,
  teams,
}: {
  tip: Tip;
  teams: Team[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerTeam = useCallback(
    async (team: {
      name: string;
      logoUrl?: string;
      sport: string;
      league?: string;
    }) => {
      const res = await fetch("/api/admin/teams/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(team),
      });

      if (!res.ok) {
        throw new Error("Failed to create team");
      }

      const data = await res.json();
      return data.data?.team as Team;
    },
    [],
  );

  const handleSubmit = async (payload: PredictionFormPayload) => {
    const data = payload as PredictionSubmission;

    try {
      setSaving(true);
      setError(null);

      let homeTeamId = data.homeTeamId;
      let awayTeamId = data.awayTeamId;

      if (data.manualMode) {
        if (data.homeTeamName) {
          const createdHome = await registerTeam({
            name: data.homeTeamName,
            logoUrl: data.homeTeamLogoUrl,
            sport: data.sport,
            league: data.league,
          });
          homeTeamId = createdHome.id;
        }

        if (data.awayTeamName) {
          const createdAway = await registerTeam({
            name: data.awayTeamName,
            logoUrl: data.awayTeamLogoUrl,
            sport: data.sport,
            league: data.league,
          });
          awayTeamId = createdAway.id;
        }
      }

      const res = await fetch(`/api/admin/predictions?id=${tip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          serializePayload({
            ...data,
            homeTeamId: homeTeamId || "",
            awayTeamId: awayTeamId || "",
          }),
        ),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update prediction");
      }

      router.push("/admin/predictions");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update prediction",
      );
    } finally {
      setSaving(false);
    }
  };

  const initialValues: PredictionFormValues = {
    title: tip.title,
    content: tip.content,
    summary: tip.summary || "",
    odds: tip.odds?.toString() || "",
    oddsSource: (tip.oddsSource as "manual" | "api_auto") || "manual",
    sport: tip.sport,
    league: tip.league || "",
    matchDate: tip.matchDate
      ? new Date(tip.matchDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    homeTeamId: tip.homeTeam?.id || "",
    awayTeamId: tip.awayTeam?.id || "",
    predictionType: tip.predictionType || "winner",
    predictedOutcome: tip.predictedOutcome || "",
    ticketSnapshots: tip.ticketSnapshots || [],
    isVIP: tip.isVIP,
    category: tip.category,
    featured: tip.featured,
    status: (tip.status as PredictionFormValues["status"]) || "draft",
    publishAt: tip.publishAt
      ? new Date(tip.publishAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    tags: tip.tags.join(", "),
    confidenceLevel: tip.confidenceLevel?.toString() || "",
    result: (tip.result || "pending") as PredictionFormValues["result"],
    matchResult: tip.matchResult || "",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            Admin edit
          </p>
          <h1 className="mt-2 text-3xl font-bold">Edit Prediction</h1>
          <p className="mt-2 text-muted-foreground">
            Update the prediction, then return to the admin list.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/predictions")}
        >
          Back to list
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 md:p-6">
          <PredictionForm
            mode="edit"
            teams={teams}
            initialValues={initialValues}
            initialManualMode={false}
            isSubmitting={saving}
            submitLabel="Save Changes"
            onCancel={() => router.push("/admin/predictions")}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
