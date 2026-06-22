"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  X,
} from "lucide-react";

interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  shortName?: string;
  league?: string;
  country?: string;
  externalId?: string;
  sport?: string;
  metadata?: Record<string, unknown>;
}

interface Tip {
  id: string;
  title: string;
  content: string;
  summary?: string;
  odds?: number;
  oddsSource: string;
  sport: string;
  league?: string;
  matchDate?: string;
  homeTeam?: Team;
  awayTeam?: Team;
  predictionType?: string;
  predictedOutcome?: string;
  confidenceLevel?: number;
  ticketSnapshots: string[];
  isVIP: boolean;
  category: "tip" | "update";
  featured: boolean;
  status: string;
  result?: string;
  matchResult?: string;
  createdAt: string;
  publishAt: string;
  tags: string[];
}

export default function AdminPredictionsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tips, setTips] = useState<Tip[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  // Separate search states for home & away API-Football queries
  const [homeSearchQuery, setHomeSearchQuery] = useState("");
  const [awaySearchQuery, setAwaySearchQuery] = useState("");
  const [homeSearchResults, setHomeSearchResults] = useState<Team[]>([]);
  const [awaySearchResults, setAwaySearchResults] = useState<Team[]>([]);
  const [searchingHomeTeams, setSearchingHomeTeams] = useState(false);
  const [searchingAwayTeams, setSearchingAwayTeams] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [manualHomeTeam, setManualHomeTeam] = useState({
    name: "",
    logoUrl: "",
  });
  const [manualAwayTeam, setManualAwayTeam] = useState({
    name: "",
    logoUrl: "",
  });
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    summary: "",
    odds: "",
    oddsSource: "manual" as "manual" | "api_auto",
    sport: "FOOTBALL",
    league: "",
    matchDate: new Date().toISOString().slice(0, 16),
    homeTeamId: "",
    awayTeamId: "",
    predictionType: "",
    predictedOutcome: "",
    ticketSnapshots: [] as string[],
    isVIP: false,
    category: "tip" as "tip" | "update",
    featured: false,
    status: "published" as "draft" | "scheduled" | "published" | "archived",
    publishAt: "",
    tags: "",
    confidenceLevel: "100",
    result: "pending" as "won" | "lost" | "void" | "pending",
    matchResult: "",
  });

  // Search and pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const [pagination, setPagination] = useState({
    page: 1,
    limit: itemsPerPage,
    total: 0,
    hasMore: false,
    totalPages: 1,
  });

  const fetchTips = useCallback(
    async (page = currentPage) => {
      try {
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
        if (res.ok) {
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
        }
      } catch (error) {
        console.error("Failed to fetch tips:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      currentPage,
      filterCategory,
      filterResult,
      filterStatus,
      itemsPerPage,
      searchQuery,
    ],
  );

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchTeams();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchTips();
    }
  }, [user, fetchTips]);

  // Auto-update title when teams change
  useEffect(() => {
    if (!editingTip) {
      let homeTeamName = "";
      let awayTeamName = "";

      if (manualMode) {
        homeTeamName = manualHomeTeam.name;
        awayTeamName = manualAwayTeam.name;
      } else {
        const homeTeam = teams.find((t) => t.id === formData.homeTeamId);
        const awayTeam = teams.find((t) => t.id === formData.awayTeamId);
        homeTeamName = homeTeam?.name || "";
        awayTeamName = awayTeam?.name || "";
      }

      if (homeTeamName && awayTeamName) {
        setFormData((prev) => ({
          ...prev,
          title: `${homeTeamName} vs ${awayTeamName}`,
        }));
      }
    }
  }, [
    manualMode,
    manualHomeTeam.name,
    manualAwayTeam.name,
    formData.homeTeamId,
    formData.awayTeamId,
    teams,
    editingTip,
  ]);

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/admin/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(data.data.teams || []);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  const uploadToCloudinary = async (
    file: File,
  ): Promise<{ secure_url: string; public_id: string }> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as
      | string
      | undefined;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as
      | string
      | undefined;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
      );
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: fd,
      },
    );
    if (!res.ok) {
      try {
        const errJson = await res.json();
        throw new Error(errJson?.error?.message || "Cloudinary upload failed");
      } catch {
        throw new Error("Cloudinary upload failed");
      }
    }
    return res.json();
  };

  const handleTicketSnapshotUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (formData.ticketSnapshots.length >= 10) {
      setErrors({ ...errors, tickets: "Maximum 10 ticket snapshots allowed" });
      return;
    }
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, tickets: "File size must be less than 5MB" });
      return;
    }
    setUploadingImage(true);
    setErrors({ ...errors, tickets: "" });
    try {
      const result = await uploadToCloudinary(file);
      setFormData({
        ...formData,
        ticketSnapshots: [...formData.ticketSnapshots, result.secure_url],
      });
    } catch (err) {
      console.error("Snapshot upload failed", err);
      setErrors({
        ...errors,
        tickets:
          err instanceof Error
            ? `Failed to upload image: ${err.message}`
            : "Failed to upload image. Please try again.",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveTicketSnapshot = (index: number) => {
    setFormData({
      ...formData,
      ticketSnapshots: formData.ticketSnapshots.filter((_, i) => i !== index),
    });
  };

  const searchTeams = async (query: string, target: "home" | "away") => {
    if (query.length < 2) {
      if (target === "home") setHomeSearchResults([]);
      else setAwaySearchResults([]);
      return;
    }
    if (target === "home") {
      setSearchingHomeTeams(true);
    } else {
      setSearchingAwayTeams(true);
    }
    try {
      const res = await fetch(
        `/api/admin/teams/search?query=${encodeURIComponent(query)}&sport=${
          formData.sport
        }`,
      );
      if (res.ok) {
        const data = await res.json();
        if (target === "home") setHomeSearchResults(data.data.teams || []);
        else setAwaySearchResults(data.data.teams || []);
      }
    } catch (error) {
      console.error("Failed to search teams:", error);
    } finally {
      if (target === "home") {
        setSearchingHomeTeams(false);
      } else {
        setSearchingAwayTeams(false);
      }
    }
  };

  const handleSelectTeamFromAPI = async (
    team: Team,
    position: "home" | "away",
  ) => {
    // Create team in our database if it doesn't exist
    try {
      const res = await fetch("/api/admin/teams/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(team),
      });

      if (res.ok) {
        const data = await res.json();
        const createdTeam = data.data.team;

        // Add to local teams list
        setTeams((prev) => {
          const exists = prev.find((t) => t.id === createdTeam.id);
          return exists ? prev : [...prev, createdTeam];
        });

        // Set in form
        if (position === "home") {
          setFormData({ ...formData, homeTeamId: createdTeam.id });
          setHomeSearchResults([]);
          setHomeSearchQuery("");
        } else {
          setFormData({ ...formData, awayTeamId: createdTeam.id });
          setAwaySearchResults([]);
          setAwaySearchQuery("");
        }
      }
    } catch (error) {
      console.error("Failed to create team:", error);
      alert("Failed to add team. Please try again.");
    }
  };

  const handleManualTeamLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    position: "home" | "away",
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, logo: "Logo size must be less than 2MB" });
      return;
    }
    setUploadingImage(true);
    setErrors({ ...errors, logo: "" });
    try {
      const result = await uploadToCloudinary(file);
      if (position === "home") {
        setManualHomeTeam({ ...manualHomeTeam, logoUrl: result.secure_url });
      } else {
        setManualAwayTeam({ ...manualAwayTeam, logoUrl: result.secure_url });
      }
    } catch (err) {
      console.error("Logo upload failed", err);
      setErrors({
        ...errors,
        logo:
          err instanceof Error
            ? `Failed to upload logo: ${err.message}`
            : "Failed to upload logo. Please try again.",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    // if (!formData.title.trim()) newErrors.title = "Title is required";
    // if (!formData.summary.trim()) newErrors.summary = "Summary is required";
    if (!formData.matchDate) newErrors.matchDate = "Match date is required";
    if (!formData.predictedOutcome.trim())
      newErrors.outcome = "Predicted outcome is required";
    if (manualMode) {
      if (!manualHomeTeam.name.trim())
        newErrors.homeTeam = "Home team name is required";
      if (!manualAwayTeam.name.trim())
        newErrors.awayTeam = "Away team name is required";
    } else {
      if (!formData.homeTeamId)
        newErrors.homeTeam = "Please select a home team";
      if (!formData.awayTeamId)
        newErrors.awayTeam = "Please select an away team";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const url = editingTip
        ? `/api/admin/predictions?id=${editingTip.id}`
        : "/api/admin/predictions";
      const method = editingTip ? "PUT" : "POST";

      // Handle manual mode team creation
      let homeTeamId = formData.homeTeamId;
      let awayTeamId = formData.awayTeamId;
      if (manualMode) {
        if (manualHomeTeam.name) {
          const homeRes = await fetch("/api/admin/teams/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: manualHomeTeam.name,
              logoUrl: manualHomeTeam.logoUrl,
              sport: formData.sport,
              league: formData.league,
            }),
          });
          if (homeRes.ok) {
            const homeData = await homeRes.json();
            homeTeamId = homeData.data?.team?.id || homeTeamId;
          }
        }
        if (manualAwayTeam.name) {
          const awayRes = await fetch("/api/admin/teams/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: manualAwayTeam.name,
              logoUrl: manualAwayTeam.logoUrl,
              sport: formData.sport,
              league: formData.league,
            }),
          });
          if (awayRes.ok) {
            const awayData = await awayRes.json();
            awayTeamId = awayData.data?.team?.id || awayTeamId;
          }
        }
      }

      const payload = {
        ...formData,
        homeTeamId: homeTeamId || undefined,
        awayTeamId: awayTeamId || undefined,
        odds: formData.odds ? parseFloat(formData.odds) : undefined,
        confidenceLevel: formData.confidenceLevel
          ? parseInt(formData.confidenceLevel as unknown as string)
          : undefined,
        matchDate: formData.matchDate || undefined,
        publishAt: formData.publishAt || new Date().toISOString(),
        content: formData.content || formData.summary,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        result: formData.result,
        category: formData.category,
        matchResult: formData.matchResult,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchTips(currentPage);
        setShowForm(false);
        setEditingTip(null);
        resetForm();
        setErrors({});
      } else {
        const error = await res.json();
        setErrors({ submit: error.error || "Failed to save prediction" });
      }
    } catch (error) {
      console.error("Failed to save prediction:", error);
      setErrors({ submit: "Failed to save prediction. Please try again." });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      summary: "",
      odds: "",
      oddsSource: "manual",
      sport: "FOOTBALL",
      league: "",
      matchDate: "",
      homeTeamId: "",
      awayTeamId: "",
      predictionType: "winner",
      predictedOutcome: "",
      ticketSnapshots: [],
      isVIP: false,
      category: "tip",
      featured: false,
      status: "published",
      publishAt: "",
      tags: "",
      confidenceLevel: "",
      result: "pending",
      matchResult: "",
    });
    setManualHomeTeam({ name: "", logoUrl: "" });
    setManualAwayTeam({ name: "", logoUrl: "" });
    setManualMode(false);
    setErrors({});
  };

  const handleEdit = (tip: Tip) => {
    setEditingTip(tip);
    setFormData({
      title: tip.title,
      content: tip.content,
      summary: tip.summary || "",
      odds: tip.odds?.toString() || "",
      oddsSource: tip.oddsSource as "manual" | "api_auto",
      sport: tip.sport,
      league: tip.league || "",
      matchDate: tip.matchDate
        ? new Date(tip.matchDate).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      homeTeamId: tip.homeTeam?.id || "",
      awayTeamId: tip.awayTeam?.id || "",
      predictionType: tip.predictionType || "",
      predictedOutcome: tip.predictedOutcome || "",
      ticketSnapshots: tip.ticketSnapshots || [],
      isVIP: tip.isVIP,
      category: tip.category,
      featured: tip.featured,
      status: tip.status as "draft" | "scheduled" | "published" | "archived",
      publishAt: tip.publishAt,
      tags: tip.tags.join(", "),
      confidenceLevel: tip.confidenceLevel?.toString() || "",
      result: (tip.result || "pending") as "won" | "lost" | "void" | "pending",
      matchResult: tip.matchResult || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prediction?")) return;

    try {
      const res = await fetch(`/api/admin/predictions?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTips(currentPage);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete prediction");
      }
    } catch (error) {
      console.error("Failed to delete prediction:", error);
      alert("Failed to delete prediction");
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

    try {
      // First fetch the current tip data
      const currentTip = tips.find((tip) => tip.id === id);
      if (!currentTip) return;

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
        }),
      });

      if (res.ok) {
        fetchTips(currentPage);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update prediction result");
      }
    } catch (error) {
      console.error("Failed to settle prediction:", error);
      alert("Failed to update prediction result");
    }
  };

  const totalPages = pagination.totalPages;
  const displayStart =
    pagination.total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const displayEnd =
    pagination.total === 0
      ? 0
      : Math.min(currentPage * itemsPerPage, pagination.total);

  useEffect(() => {
    setCurrentPage((prev) =>
      Math.min(prev, Math.max(1, pagination.totalPages)),
    );
  }, [pagination.totalPages]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex justify-center items-center">
              Sports Predictions Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your sports prediction tips
            </p>
          </div>
        </div>
        <div className="flex justify-end p-4">
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Prediction
          </Button>
        </div>
        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search predictions..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={filterResult}
                onChange={(e) => {
                  setFilterResult(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
              >
                <option value="all">All Results</option>
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="void">Void</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
              >
                <option value="all">All Categories</option>
                <option value="tip">Tips</option>
                <option value="update">Updates</option>
              </select>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Showing {displayStart}-{displayEnd} of {pagination.total}{" "}
              predictions
            </div>
          </CardContent>
        </Card>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {editingTip ? "Edit Prediction" : "Create New Prediction"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Match & Teams FIRST */}
                {errors.submit && (
                  <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
                    {errors.submit}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">Match & Teams</h3>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="manualMode" className="text-sm">
                        Manual Mode
                      </Label>
                      <input
                        type="checkbox"
                        id="manualMode"
                        checked={manualMode}
                        onChange={(e) => setManualMode(e.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="sport">Sport *</Label>
                      <select
                        id="sport"
                        className="w-full px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
                        value={formData.sport}
                        onChange={(e) =>
                          setFormData({ ...formData, sport: e.target.value })
                        }
                      >
                        <option value="FOOTBALL">Football</option>
                        <option value="BASKETBALL">Basketball</option>
                        <option value="TENNIS">Tennis</option>
                        <option value="CRICKET">Cricket</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="league">League/Competition</Label>
                      <Input
                        id="league"
                        value={formData.league}
                        onChange={(e) =>
                          setFormData({ ...formData, league: e.target.value })
                        }
                        placeholder="e.g., Premier League"
                      />
                    </div>

                    <div>
                      <Label htmlFor="matchDate">Match Date & Time</Label>
                      {/* <DateTimePicker
                        value={formData.matchDate}
                        onChange={(iso) =>
                          setFormData({ ...formData, matchDate: iso })
                        }
                      
                        required
                      /> */}
                      <Input
                        type="datetime-local"
                        value={formData.matchDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            matchDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
                      />
                      {errors.matchDate && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.matchDate}
                        </p>
                      )}
                    </div>
                  </div>
                  {!manualMode ? (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* HOME TEAM SELECTION */}
                        <div className="space-y-2">
                          <Label htmlFor="homeTeamId">Home Team *</Label>
                          <select
                            id="homeTeamId"
                            className={`w-full px-3 py-2 bg-background border-2 border-border text-foreground rounded-md ${
                              errors.homeTeam ? "border-destructive" : ""
                            }`}
                            value={formData.homeTeamId}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                homeTeamId: e.target.value,
                              })
                            }
                          >
                            <option value="">Select Home Team</option>
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                          {errors.homeTeam && (
                            <p className="text-xs text-destructive mt-1">
                              {errors.homeTeam}
                            </p>
                          )}
                          <div className="border-2 border-dashed border-border p-3 rounded-md">
                            <Label
                              htmlFor="homeTeamSearch"
                              className="text-xs font-medium"
                            >
                              Search Home Team (API-Football)
                            </Label>
                            <Input
                              id="homeTeamSearch"
                              placeholder="e.g., Chelsea"
                              value={homeSearchQuery}
                              onChange={(e) => {
                                setHomeSearchQuery(e.target.value);
                                searchTeams(e.target.value, "home");
                              }}
                              className="mt-1"
                            />
                            {searchingHomeTeams && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Searching...
                              </p>
                            )}
                            {homeSearchResults.length > 0 && (
                              <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                                {homeSearchResults.map((t) => (
                                  <div
                                    key={t.externalId || t.name}
                                    className="flex items-center justify-between p-2 border border-border rounded-md hover:bg-secondary"
                                  >
                                    <div className="flex items-center gap-2">
                                      {t.logoUrl && (
                                        <img
                                          src={t.logoUrl}
                                          alt={t.name}
                                          className="w-6 h-6 object-contain"
                                        />
                                      )}
                                      <span className="text-xs font-medium">
                                        {t.name}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleSelectTeamFromAPI(t, "home")
                                      }
                                    >
                                      Select
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* AWAY TEAM SELECTION */}
                        <div className="space-y-2">
                          <Label htmlFor="awayTeamId">Away Team *</Label>
                          <select
                            id="awayTeamId"
                            className={`w-full px-3 py-2 bg-background border-2 border-border text-foreground rounded-md ${
                              errors.awayTeam ? "border-destructive" : ""
                            }`}
                            value={formData.awayTeamId}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                awayTeamId: e.target.value,
                              })
                            }
                          >
                            <option value="">Select Away Team</option>
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                          {errors.awayTeam && (
                            <p className="text-xs text-destructive mt-1">
                              {errors.awayTeam}
                            </p>
                          )}
                          <div className="border-2 border-dashed border-border p-3 rounded-md">
                            <Label
                              htmlFor="awayTeamSearch"
                              className="text-xs font-medium"
                            >
                              Search Away Team (API-Football)
                            </Label>
                            <Input
                              id="awayTeamSearch"
                              placeholder="e.g., Barcelona"
                              value={awaySearchQuery}
                              onChange={(e) => {
                                setAwaySearchQuery(e.target.value);
                                searchTeams(e.target.value, "away");
                              }}
                              className="mt-1"
                            />
                            {searchingAwayTeams && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Searching...
                              </p>
                            )}
                            {awaySearchResults.length > 0 && (
                              <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                                {awaySearchResults.map((t) => (
                                  <div
                                    key={t.externalId || t.name}
                                    className="flex items-center justify-between p-2 border border-border rounded-md hover:bg-secondary"
                                  >
                                    <div className="flex items-center gap-2">
                                      {t.logoUrl && (
                                        <img
                                          src={t.logoUrl}
                                          alt={t.name}
                                          className="w-6 h-6 object-contain"
                                        />
                                      )}
                                      <span className="text-xs font-medium">
                                        {t.name}
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleSelectTeamFromAPI(t, "away")
                                      }
                                    >
                                      Select
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label>Home Team *</Label>
                          <Input
                            placeholder="Team name"
                            value={manualHomeTeam.name}
                            onChange={(e) =>
                              setManualHomeTeam({
                                ...manualHomeTeam,
                                name: e.target.value,
                              })
                            }
                            className={
                              errors.homeTeam ? "border-destructive" : ""
                            }
                          />
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleManualTeamLogoUpload(e, "home")
                            }
                            disabled={uploadingImage}
                          />
                          {manualHomeTeam.logoUrl && (
                            <img
                              src={manualHomeTeam.logoUrl}
                              alt="Home Team Logo"
                              className="w-16 h-16 object-contain border rounded"
                            />
                          )}
                          {errors.homeTeam && (
                            <p className="text-xs text-destructive">
                              {errors.homeTeam}
                            </p>
                          )}
                        </div>
                        <div className="space-y-3">
                          <Label>Away Team *</Label>
                          <Input
                            placeholder="Team name"
                            value={manualAwayTeam.name}
                            onChange={(e) =>
                              setManualAwayTeam({
                                ...manualAwayTeam,
                                name: e.target.value,
                              })
                            }
                            className={
                              errors.awayTeam ? "border-destructive" : ""
                            }
                          />
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleManualTeamLogoUpload(e, "away")
                            }
                            disabled={uploadingImage}
                          />
                          {manualAwayTeam.logoUrl && (
                            <img
                              src={manualAwayTeam.logoUrl}
                              alt="Away Team Logo"
                              className="w-16 h-16 object-contain border rounded"
                            />
                          )}
                          {errors.awayTeam && (
                            <p className="text-xs text-destructive">
                              {errors.awayTeam}
                            </p>
                          )}
                        </div>
                      </div>
                      {errors.logo && (
                        <p className="text-xs text-destructive">
                          {errors.logo}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Basic Information</h3>
                  <div>
                    <Label htmlFor="title">Prediction Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g., Manchester United vs Liverpool - Match Winner"
                      className={errors.title ? "border-destructive" : ""}
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.title}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="summary">Short Summary *</Label>
                    <Input
                      id="summary"
                      value={formData.summary}
                      onChange={(e) =>
                        setFormData({ ...formData, summary: e.target.value })
                      }
                      placeholder="Brief description for preview"
                      className={errors.summary ? "border-destructive" : ""}
                    />
                    {errors.summary && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.summary}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="content">Full Analysis (Optional)</Label>
                    <textarea
                      id="content"
                      className="w-full min-h-[200px] px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      placeholder="Detailed analysis (supports markdown)"
                    />
                  </div>
                </div>

                {/* Prediction Details */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Prediction Details</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="hidden">
                      <Label htmlFor="predictionType">Prediction Type</Label>
                      <select
                        id="predictionType"
                        className="w-full px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
                        // value={formData.predictionType}
                        value="winner"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            predictionType: e.target.value,
                          })
                        }
                        disabled
                      >
                        <option value="default" disabled>
                          Default (Match Winner)
                        </option>

                        {/* <option value="winner">Match Winner</option>
                        <option value="over_under">Over/Under Goals</option>
                        <option value="both_teams_score">
                          Both Teams to Score
                        </option>
                        <option value="correct_score">Correct Score</option>
                        <option value="handicap">Handicap</option>
                        <option value="other">Other</option> */}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="predictedOutcome">
                        Predicted Outcome
                      </Label>
                      <Input
                        id="predictedOutcome"
                        value={formData.predictedOutcome}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            predictedOutcome: e.target.value,
                          })
                        }
                        placeholder="e.g., Home Win, Over 2.5, Yes"
                      />
                    </div>

                    <div>
                      <Label htmlFor="matchResult">Match Result</Label>
                      <Input
                        id="matchResult"
                        value={formData.matchResult}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            matchResult: e.target.value,
                          })
                        }
                        placeholder="e.g., FT: 2:0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="odds">Odds</Label>
                      <Input
                        id="odds"
                        type="number"
                        step="0.01"
                        value={formData.odds}
                        onChange={(e) =>
                          setFormData({ ...formData, odds: e.target.value })
                        }
                        placeholder="e.g., 2.50"
                      />
                    </div>

                    <div>
                      <Label htmlFor="confidenceLevel">
                        Confidence Level (%)
                      </Label>
                      <Input
                        id="confidenceLevel"
                        type="number"
                        min={1}
                        max={100}
                        value={formData.confidenceLevel}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confidenceLevel: e.target.value,
                          })
                        }
                        placeholder="e.g., 100"
                      />
                    </div>
                  </div>

                  <div className="hidden">
                    <Label htmlFor="oddsSource">Odds Source</Label>
                    <select
                      id="oddsSource"
                      className="w-full px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
                      // value={formData.oddsSource}
                      value="manual"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          oddsSource: e.target.value as "manual" | "api_auto",
                        })
                      }
                    >
                      <option value="manual">Manual Entry</option>
                      <option value="api_auto">API (Automatic)</option>
                    </select>
                  </div>
                </div>

                {/* Ticket Snapshots */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">
                      Ticket Snapshots ({formData.ticketSnapshots.length}/10)
                    </h3>
                    <div className="flex items-center gap-2">
                      <Input
                        id="ticketUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleTicketSnapshotUpload}
                        disabled={
                          uploadingImage ||
                          formData.ticketSnapshots.length >= 10
                        }
                      />
                    </div>
                  </div>
                  {errors.tickets && (
                    <p className="text-xs text-destructive">{errors.tickets}</p>
                  )}

                  {formData.ticketSnapshots.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.ticketSnapshots.map((url, index) => (
                        <div
                          key={index}
                          className="relative border-2 border-border rounded-md overflow-hidden group"
                        >
                          <img
                            src={url}
                            alt={`Ticket ${index + 1}`}
                            className="w-full h-32 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTicketSnapshot(index)}
                            className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Publishing Options */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Publishing Options</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        className="w-full px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as
                              | "draft"
                              | "scheduled"
                              | "published"
                              | "archived",
                          })
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="result">Prediction Result</Label>
                      <select
                        id="result"
                        className="w-full px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
                        value={formData.result}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            result: e.target.value as
                              | "won"
                              | "lost"
                              | "void"
                              | "pending",
                          })
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                        <option value="void">Cancelled/Void</option>
                      </select>
                    </div>

                    <div className="hidden">
                      {/* <DateTimePicker
                        value={formData.publishAt}
                        onChange={(iso) =>
                          setFormData({ ...formData, publishAt: iso })
                        }
                        label="Publish Date/Time"
                      /> */}

                      <Input
                        type="datetime-local"
                        value={formData.publishAt}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            publishAt: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-background border-2 border-border text-foreground rounded-md"
                      />
                    </div>

                    <div className="hidden">
                      <Label htmlFor="tags">Tags (comma-separated)</Label>
                      <Input
                        id="tags"
                        value={formData.tags}
                        onChange={(e) =>
                          setFormData({ ...formData, tags: e.target.value })
                        }
                        placeholder="e.g., football, premier-league"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isVIP"
                        checked={formData.isVIP}
                        onChange={(e) =>
                          setFormData({ ...formData, isVIP: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="isVIP">VIP Only</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor="category" className="text-sm">
                        Category:
                      </Label>
                      <select
                        id="category"
                        className="px-2 py-1 bg-background border-2 border-border text-foreground rounded text-sm"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            category: e.target.value as "tip" | "update",
                          })
                        }
                      >
                        <option value="tip">Tip</option>
                        <option value="update">VIP Update</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="featured"
                        checked={formData.featured}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            featured: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="featured">Featured</Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingTip ? "Update" : "Create"} Prediction
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingTip(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tips List */}
        <div className="space-y-4">
          {tips.map((tip) => (
            <Card key={tip.id}>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-base md:text-lg font-bold">
                        {tip.title}
                      </h3>
                      {tip.predictedOutcome && (
                        <Badge variant="outline">{tip.predictedOutcome}</Badge>
                      )}
                      {tip.isVIP && (
                        <Badge className="bg-primary text-primary-foreground">
                          VIP
                        </Badge>
                      )}
                    </div>

                    {(tip.homeTeam || tip.awayTeam) && (
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                        {tip.homeTeam && (
                          <div className="flex items-center gap-1.5">
                            {tip.homeTeam.logoUrl && (
                              <img
                                src={tip.homeTeam.logoUrl}
                                alt={tip.homeTeam.name}
                                className="w-5 h-5 md:w-6 md:h-6 object-contain"
                              />
                            )}
                            <span className="text-xs md:text-sm font-medium">
                              {tip.homeTeam.name}
                            </span>
                          </div>
                        )}
                        {tip.homeTeam && tip.awayTeam && (
                          <span className="text-xs md:text-sm text-muted-foreground">
                            vs
                          </span>
                        )}
                        {tip.awayTeam && (
                          <div className="flex items-center gap-1.5">
                            {tip.awayTeam.logoUrl && (
                              <img
                                src={tip.awayTeam.logoUrl}
                                alt={tip.awayTeam.name}
                                className="w-5 h-5 md:w-6 md:h-6 object-contain"
                              />
                            )}
                            <span className="text-xs md:text-sm font-medium">
                              {tip.awayTeam.name}
                            </span>
                          </div>
                        )}
                        {tip.matchResult && (
                          <span className="text-xs md:text-sm font-medium text-primary">
                            {tip.matchResult}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-muted-foreground mb-2 line-clamp-2 text-sm md:text-base">
                      {tip.summary || tip.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm mb-2">
                      {tip.odds && (
                        <span className="text-primary font-bold">
                          Odds: {Number(tip.odds).toFixed(2)}
                        </span>
                      )}
                      <span className="text-muted-foreground">{tip.sport}</span>
                      {tip.league && (
                        <span className="text-muted-foreground">
                          {tip.league}
                        </span>
                      )}
                      {tip.category === "update" && (
                        <span className="text-muted-foreground">Update</span>
                      )}
                      {tip.featured && (
                        <span className="text-muted-foreground">Featured</span>
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
                      <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                        <ImageIcon className="h-3 w-3 md:h-4 md:w-4" />
                        <span>
                          {tip.ticketSnapshots.length} ticket snapshot(s)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 flex-wrap md:flex-nowrap">
                    {tip.result === "pending" && tip.status === "published" && (
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 md:flex-none bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => handleSettle(tip.id, "won")}
                        >
                          <CheckCircle className="h-4 w-4 md:mr-1" />
                          <span className="hidden md:inline">Won</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 md:flex-none"
                          onClick={() => handleSettle(tip.id, "lost")}
                        >
                          <XCircle className="h-4 w-4 md:mr-1" />
                          <span className="hidden md:inline">Lost</span>
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2 w-full md:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(tip)}
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
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="md:hidden ml-1">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {pagination.total === 0 && (
            <Card>
              <CardContent className="p-8 md:p-12 text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 opacity-50" />
                <p className="text-base md:text-lg mb-2">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
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
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
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
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}