"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  Edit,
  Image as ImageIcon,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import type {
  PredictionFormValues,
  Team,
  Tip,
} from "./_components/prediction-form-types";
import { PredictionForm } from "./_components/prediction-form.jsx";

const itemsPerPage = 100;

type PredictionFormPayload = Record<string, unknown>;

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

function createEmptyFormValues(): PredictionFormValues {
  const now = new Date().toISOString().slice(0, 16);

  return {
    title: "",
    content: "",
    summary: "",
    odds: "",
    oddsSource: "manual",
    sport: "FOOTBALL",
    league: "",
    matchDate: now,
    homeTeamId: "",
    awayTeamId: "",
    predictionType: "winner",
    predictedOutcome: "",
    ticketSnapshots: [],
    isVIP: false,
    category: "tip",
    featured: false,
    status: "published",
    publishAt: now,
    tags: "",
    confidenceLevel: "100",
    result: "pending",
    matchResult: "",
  };
}

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

export default function AdminPredictionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [tips, setTips] = useState<Tip[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTips, setLoadingTips] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [busyTipId, setBusyTipId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: itemsPerPage,
    total: 0,
    hasMore: false,
    totalPages: 1,
  });

  const fetchTeams = useCallback(async () => {
    try {
      setLoadingTeams(true);
      const res = await fetch("/api/admin/teams");
      if (!res.ok) return;
      const data = await res.json();
      setTeams(data.data.teams || []);
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const fetchTips = useCallback(
    async (page = currentPage) => {
      try {
        setLoadingTips(true);
        const params = new URLSearchParams({
          page: String(page),
          limit: String(itemsPerPage),
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (filterStatus !== "all") params.set("status", filterStatus);
        if (filterResult !== "all") params.set("result", filterResult);
        if (filterCategory !== "all") params.set("category", filterCategory);

        const res = await fetch(`/api/admin/predictions?${params.toString()}`);
        if (!res.ok) return;

        const data = await res.json();
        setTips(data.data.tips || []);

        if (data.data.pagination) {
          setPagination({
            page: data.data.pagination.page || page,
            limit: data.data.pagination.limit || itemsPerPage,
            total: data.data.pagination.total || 0,
            hasMore: Boolean(data.data.pagination.hasMore),
            totalPages: data.data.pagination.totalPages || 1,
          });
        }
      } catch (error) {
        console.error("Failed to fetch tips:", error);
      } finally {
        setLoadingTips(false);
      }
    },
    [currentPage, filterCategory, filterResult, filterStatus, searchQuery],
  );

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "ADMIN")) {
      router.replace("/");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchTeams();
      fetchTips();
    }
  }, [fetchTeams, fetchTips, user]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchTips(currentPage);
    }
  }, [currentPage, fetchTips, user]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      setCurrentPage(1);
      fetchTips(1);
    }
  }, [
    fetchTips,
    filterCategory,
    filterResult,
    filterStatus,
    searchQuery,
    user,
  ]);

  useEffect(() => {
    setCurrentPage((prev) =>
      Math.min(prev, Math.max(1, pagination.totalPages)),
    );
  }, [pagination.totalPages]);

  const displayStart =
    pagination.total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const displayEnd =
    pagination.total === 0
      ? 0
      : Math.min(currentPage * itemsPerPage, pagination.total);

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
      const createdTeam = data.data?.team as Team;

      setTeams((prev) => {
        const exists = prev.find((item) => item.id === createdTeam.id);
        return exists ? prev : [...prev, createdTeam];
      });

      return createdTeam;
    },
    [],
  );

  const handleCreateSubmit = useCallback(
    async (payload: PredictionFormPayload) => {
      const data = payload as PredictionSubmission;

      try {
        setCreateSubmitting(true);
        setCreateError(null);

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

        const res = await fetch("/api/admin/predictions", {
          method: "POST",
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
          throw new Error(data?.error || "Failed to save prediction");
        }

        await fetchTips(currentPage);
        setCreateDialogOpen(false);
        setCreateFormKey((value) => value + 1);
      } catch (error) {
        setCreateError(
          error instanceof Error ? error.message : "Failed to save prediction",
        );
      } finally {
        setCreateSubmitting(false);
      }
    },
    [currentPage, fetchTips, registerTeam],
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prediction?")) return;

    try {
      setBusyTipId(id);
      const res = await fetch(`/api/admin/predictions?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete prediction");
      }

      await fetchTips(currentPage);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete prediction",
      );
    } finally {
      setBusyTipId(null);
    }
  };

  const handleSettle = async (id: string, result: string) => {
    if (
      !confirm(
        `Are you sure you want to mark this prediction as ${result.toUpperCase()}?`,
      )
    ) {
      return;
    }

    const currentTip = tips.find((tip) => tip.id === id);
    if (!currentTip) return;

    try {
      setBusyTipId(id);
      const res = await fetch(`/api/admin/predictions?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: currentTip.title,
          content: currentTip.content,
          summary: currentTip.summary,
          odds: currentTip.odds ? Number(currentTip.odds) : undefined,
          oddsSource: currentTip.oddsSource,
          sport: currentTip.sport,
          league: currentTip.league,
          matchDate: currentTip.matchDate,
          homeTeamId: currentTip.homeTeam?.id,
          awayTeamId: currentTip.awayTeam?.id,
          predictionType: currentTip.predictionType,
          predictedOutcome: currentTip.predictedOutcome,
          ticketSnapshots: currentTip.ticketSnapshots,
          isVIP: currentTip.isVIP,
          category: currentTip.category,
          featured: currentTip.featured,
          status: currentTip.status,
          publishAt: currentTip.publishAt,
          tags: currentTip.tags,
          result,
          matchResult: currentTip.matchResult,
          confidenceLevel: currentTip.confidenceLevel,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update prediction result");
      }

      await fetchTips(currentPage);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update prediction result",
      );
    } finally {
      setBusyTipId(null);
    }
  };

  const totalPages = pagination.totalPages;

  const loadingCards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="overflow-hidden border-border/60">
          <CardContent className="p-4 md:p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-6 w-3/4 rounded bg-muted/80" />
              <div className="h-4 w-full rounded bg-muted/70" />
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded bg-muted/70" />
                <div className="h-8 w-20 rounded bg-muted/70" />
              </div>
            </div>
          </CardContent>
        </Card>
      )),
    [],
  );

  if (authLoading || (user?.role === "ADMIN" && loadingTeams && loadingTips)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 space-y-3">
            <div className="h-10 w-80 animate-pulse rounded bg-muted" />
            <div className="h-5 w-96 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="grid gap-4">{loadingCards}</div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Admin workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Sports Predictions Management
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Create, edit, and settle prediction posts with a cleaner flow.
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="md:self-start"
          >
            <Plus className="h-4 w-4" />
            New Prediction
          </Button>
        </div>

        <Card className="mb-6 border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
              <Input
                placeholder="Search predictions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border-2 border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="rounded-md border-2 border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="all">All Results</option>
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="void">Void</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-md border-2 border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="all">All Categories</option>
                <option value="tip">Tips</option>
              </select>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Showing {displayStart}-{displayEnd} of {pagination.total}{" "}
              predictions
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loadingTips ? (
            loadingCards
          ) : tips.length > 0 ? (
            tips.map((tip) => (
              <Card
                key={tip.id}
                className="overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md"
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold md:text-lg">
                          {tip.title}
                        </h3>
                        {tip.predictedOutcome && (
                          <Badge variant="outline">
                            {tip.predictedOutcome}
                          </Badge>
                        )}
                        {tip.isVIP && (
                          <Badge className="bg-primary text-primary-foreground">
                            VIP
                          </Badge>
                        )}
                      </div>

                      {(tip.homeTeam || tip.awayTeam) && (
                        <div className="mb-3 flex flex-wrap items-center gap-2 md:gap-3">
                          {tip.homeTeam && (
                            <div className="flex items-center gap-1.5">
                              {tip.homeTeam.logoUrl && (
                                <img
                                  src={tip.homeTeam.logoUrl}
                                  alt={tip.homeTeam.name}
                                  className="h-5 w-5 object-contain md:h-6 md:w-6"
                                />
                              )}
                              <span className="text-xs font-medium md:text-sm">
                                {tip.homeTeam.name}
                              </span>
                            </div>
                          )}
                          {tip.homeTeam && tip.awayTeam && (
                            <span className="text-xs text-muted-foreground md:text-sm">
                              vs
                            </span>
                          )}
                          {tip.awayTeam && (
                            <div className="flex items-center gap-1.5">
                              {tip.awayTeam.logoUrl && (
                                <img
                                  src={tip.awayTeam.logoUrl}
                                  alt={tip.awayTeam.name}
                                  className="h-5 w-5 object-contain md:h-6 md:w-6"
                                />
                              )}
                              <span className="text-xs font-medium md:text-sm">
                                {tip.awayTeam.name}
                              </span>
                            </div>
                          )}
                          {tip.matchResult && (
                            <span className="text-xs font-medium text-primary md:text-sm">
                              {tip.matchResult}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="mb-2 line-clamp-2 text-sm text-muted-foreground md:text-base">
                        {tip.summary || tip.content}
                      </p>

                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs md:gap-4 md:text-sm">
                        {tip.odds && (
                          <span className="font-bold text-primary">
                            Odds: {Number(tip.odds).toFixed(2)}
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {tip.sport}
                        </span>
                        {tip.league && (
                          <span className="text-muted-foreground">
                            {tip.league}
                          </span>
                        )}
                        {tip.category === "update" && (
                          <span className="text-muted-foreground">Update</span>
                        )}
                        {tip.featured && (
                          <span className="text-muted-foreground">
                            Featured
                          </span>
                        )}
                        {tip.result && tip.result !== "pending" && (
                          <span className="text-muted-foreground">
                            {tip.result === "void" ? "Cancelled" : tip.result}
                          </span>
                        )}
                        {typeof tip.confidenceLevel === "number" && (
                          <span className="text-muted-foreground">
                            {tip.confidenceLevel}%
                          </span>
                        )}
                      </div>

                      {tip.ticketSnapshots.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
                          <ImageIcon className="h-3 w-3 md:h-4 md:w-4" />
                          <span>
                            {tip.ticketSnapshots.length} ticket snapshot(s)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row flex-wrap gap-2 md:flex-col md:flex-nowrap">
                      {tip.result === "pending" &&
                        tip.status === "published" && (
                          <div className="flex w-full gap-2 md:w-auto">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-500 text-white hover:bg-green-600 md:flex-none"
                              onClick={() => handleSettle(tip.id, "won")}
                              disabled={busyTipId === tip.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span className="hidden md:inline">Won</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 md:flex-none"
                              onClick={() => handleSettle(tip.id, "lost")}
                              disabled={busyTipId === tip.id}
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="hidden md:inline">Lost</span>
                            </Button>
                          </div>
                        )}
                      <div className="flex w-full gap-2 md:w-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(`/admin/predictions/${tip.id}`)
                          }
                          className="flex-1 md:flex-none"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="md:hidden ml-1">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(tip.id)}
                          className="flex-1 md:flex-none"
                          disabled={busyTipId === tip.id}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="md:hidden ml-1">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-8 text-center text-muted-foreground md:p-12">
                <ImageIcon className="mx-auto mb-4 h-12 w-12 opacity-50 md:h-16 md:w-16" />
                <p className="mb-2 text-base md:text-lg">
                  {searchQuery.trim() ||
                  filterStatus !== "all" ||
                  filterResult !== "all" ||
                  filterCategory !== "all"
                    ? "No predictions match your filters"
                    : "No predictions found"}
                </p>
                <p className="text-xs md:text-sm">
                  {searchQuery.trim() ||
                  filterStatus !== "all" ||
                  filterResult !== "all" ||
                  filterCategory !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Create your first sports prediction to get started"}
                </p>
              </CardContent>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1 || loadingTips}
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from(
                    { length: Math.min(5, totalPages) },
                    (_, index) => {
                      let pageNum = index + 1;
                      if (totalPages > 5) {
                        if (currentPage <= 3) pageNum = index + 1;
                        else if (currentPage >= totalPages - 2)
                          pageNum = totalPages - 4 + index;
                        else pageNum = currentPage - 2 + index;
                      }

                      return (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          onClick={() => setCurrentPage(pageNum)}
                          className="hidden sm:inline-flex"
                          disabled={loadingTips}
                        >
                          {pageNum}
                        </Button>
                      );
                    },
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages || loadingTips}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setCreateFormKey((value) => value + 1);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Prediction</DialogTitle>
            <DialogDescription>
              Use the modern form below to create a new prediction. Manual mode
              still works for custom teams.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {createError}
            </div>
          )}

          <PredictionForm
            key={createFormKey}
            mode="create"
            teams={teams}
            initialValues={createEmptyFormValues()}
            initialManualMode={false}
            isLoading={loadingTeams}
            isSubmitting={createSubmitting}
            submitLabel="Create Prediction"
            onCancel={() => setCreateDialogOpen(false)}
            onSubmit={handleCreateSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
