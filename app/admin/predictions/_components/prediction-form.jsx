"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, X } from "lucide-react";

export function PredictionForm({
  mode,
  teams,
  initialValues,
  initialManualMode = false,
  isLoading = false,
  isSubmitting = false,
  submitLabel,
  onCancel,
  onSubmit,
}) {
  const [formData, setFormData] = useState(initialValues);
  const [manualMode, setManualMode] = useState(initialManualMode);
  const [manualHomeTeam, setManualHomeTeam] = useState({
    name: "",
    logoUrl: "",
  });
  const [manualAwayTeam, setManualAwayTeam] = useState({
    name: "",
    logoUrl: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(initialValues);
    setManualMode(initialManualMode);
  }, [initialValues, initialManualMode]);

  useEffect(() => {
    if (mode === "edit" || manualMode) return;

    const homeTeam = teams.find((t) => t.id === formData.homeTeamId);
    const awayTeam = teams.find((t) => t.id === formData.awayTeamId);

    if (homeTeam?.name && awayTeam?.name) {
      setFormData((prev) => ({
        ...prev,
        title: `${homeTeam.name} vs ${awayTeam.name}`,
      }));
    }
  }, [mode, manualMode, formData.homeTeamId, formData.awayTeamId, teams]);

  const uploadToCloudinary = async (file) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

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
      const fallback = "Cloudinary upload failed";
      try {
        const errJson = await res.json();
        throw new Error(errJson?.error?.message || fallback);
      } catch {
        throw new Error(fallback);
      }
    }

    return res.json();
  };

  const handleTicketSnapshotUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (formData.ticketSnapshots.length >= 10) {
      setErrors((prev) => ({
        ...prev,
        tickets: "Maximum 10 ticket snapshots allowed",
      }));
      return;
    }

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        tickets: "File size must be less than 5MB",
      }));
      return;
    }

    setUploadingImage(true);
    setErrors((prev) => ({ ...prev, tickets: "" }));

    try {
      const result = await uploadToCloudinary(file);
      setFormData((prev) => ({
        ...prev,
        ticketSnapshots: [...prev.ticketSnapshots, result.secure_url],
      }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        tickets:
          err instanceof Error
            ? `Failed to upload image: ${err.message}`
            : "Failed to upload image. Please try again.",
      }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleManualTeamLogoUpload = async (e, position) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        logo: "Logo size must be less than 2MB",
      }));
      return;
    }

    setUploadingImage(true);
    setErrors((prev) => ({ ...prev, logo: "" }));

    try {
      const result = await uploadToCloudinary(file);
      if (position === "home") {
        setManualHomeTeam((prev) => ({ ...prev, logoUrl: result.secure_url }));
      } else {
        setManualAwayTeam((prev) => ({ ...prev, logoUrl: result.secure_url }));
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        logo:
          err instanceof Error
            ? `Failed to upload logo: ${err.message}`
            : "Failed to upload logo. Please try again.",
      }));
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.matchDate) nextErrors.matchDate = "Match date is required";
    if (!formData.predictedOutcome.trim())
      nextErrors.outcome = "Predicted outcome is required";

    if (manualMode) {
      if (!manualHomeTeam.name.trim())
        nextErrors.homeTeam = "Home team name is required";
      if (!manualAwayTeam.name.trim())
        nextErrors.awayTeam = "Away team name is required";
    } else {
      if (!formData.homeTeamId)
        nextErrors.homeTeam = "Please select a home team";
      if (!formData.awayTeamId)
        nextErrors.awayTeam = "Please select an away team";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const parsedTags = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title,
      content: formData.content,
      summary: formData.summary,
      oddsSource: formData.oddsSource,
      sport: formData.sport,
      league: formData.league,
      matchDate: formData.matchDate,
      predictionType: formData.predictionType,
      predictedOutcome: formData.predictedOutcome,
      ticketSnapshots: formData.ticketSnapshots,
      isVIP: formData.isVIP,
      category: formData.category,
      featured: formData.featured,
      status: formData.status,
      publishAt: formData.publishAt,
      result: formData.result,
      matchResult: formData.matchResult,
      manualMode,
      homeTeamName: manualMode ? manualHomeTeam.name.trim() : undefined,
      awayTeamName: manualMode ? manualAwayTeam.name.trim() : undefined,
      homeTeamLogoUrl: manualMode
        ? manualHomeTeam.logoUrl || undefined
        : undefined,
      awayTeamLogoUrl: manualMode
        ? manualAwayTeam.logoUrl || undefined
        : undefined,
      odds: formData.odds ? Number.parseFloat(formData.odds) : undefined,
      confidenceLevel: formData.confidenceLevel
        ? Number.parseInt(formData.confidenceLevel, 10)
        : undefined,
      homeTeamId: manualMode ? undefined : formData.homeTeamId || undefined,
      awayTeamId: manualMode ? undefined : formData.awayTeamId || undefined,
      tags: parsedTags,
    };

    await onSubmit(payload);
  };

  const handleRemoveTicketSnapshot = (index) => {
    setFormData((prev) => ({
      ...prev,
      ticketSnapshots: prev.ticketSnapshots.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-11 animate-pulse rounded bg-muted/80" />
          <div className="h-11 animate-pulse rounded bg-muted/80" />
          <div className="h-11 animate-pulse rounded bg-muted/80" />
        </div>
        <div className="h-80 animate-pulse rounded bg-muted/70" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-bold text-lg">Match & Teams</h3>
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>Manual Mode</span>
            <input
              type="checkbox"
              checked={manualMode}
              onChange={(e) => setManualMode(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="sport">Sport *</Label>
            <select
              id="sport"
              className="w-full rounded-md border-2 border-border bg-background px-3 py-2 text-foreground"
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
            <Input
              id="matchDate"
              type="datetime-local"
              value={formData.matchDate}
              onChange={(e) =>
                setFormData({ ...formData, matchDate: e.target.value })
              }
            />
            {errors.matchDate && (
              <p className="mt-1 text-xs text-destructive">
                {errors.matchDate}
              </p>
            )}
          </div>
        </div>

        {!manualMode ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="homeTeamId">Home Team *</Label>
              <select
                id="homeTeamId"
                className={`w-full rounded-md border-2 bg-background px-3 py-2 text-foreground ${errors.homeTeam ? "border-destructive" : "border-border"}`}
                value={formData.homeTeamId}
                onChange={(e) =>
                  setFormData({ ...formData, homeTeamId: e.target.value })
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
                <p className="text-xs text-destructive">{errors.homeTeam}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayTeamId">Away Team *</Label>
              <select
                id="awayTeamId"
                className={`w-full rounded-md border-2 bg-background px-3 py-2 text-foreground ${errors.awayTeam ? "border-destructive" : "border-border"}`}
                value={formData.awayTeamId}
                onChange={(e) =>
                  setFormData({ ...formData, awayTeamId: e.target.value })
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
                <p className="text-xs text-destructive">{errors.awayTeam}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Label>Home Team *</Label>
              <Input
                placeholder="Team name"
                value={manualHomeTeam.name}
                onChange={(e) =>
                  setManualHomeTeam({ ...manualHomeTeam, name: e.target.value })
                }
                className={errors.homeTeam ? "border-destructive" : ""}
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleManualTeamLogoUpload(e, "home")}
                disabled={uploadingImage}
              />
              {manualHomeTeam.logoUrl && (
                <img
                  src={manualHomeTeam.logoUrl}
                  alt="Home Team Logo"
                  className="h-16 w-16 rounded border object-contain"
                />
              )}
              {errors.homeTeam && (
                <p className="text-xs text-destructive">{errors.homeTeam}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label>Away Team *</Label>
              <Input
                placeholder="Team name"
                value={manualAwayTeam.name}
                onChange={(e) =>
                  setManualAwayTeam({ ...manualAwayTeam, name: e.target.value })
                }
                className={errors.awayTeam ? "border-destructive" : ""}
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleManualTeamLogoUpload(e, "away")}
                disabled={uploadingImage}
              />
              {manualAwayTeam.logoUrl && (
                <img
                  src={manualAwayTeam.logoUrl}
                  alt="Away Team Logo"
                  className="h-16 w-16 rounded border object-contain"
                />
              )}
              {errors.awayTeam && (
                <p className="text-xs text-destructive">{errors.awayTeam}</p>
              )}
            </div>
          </div>
        )}
      </div>

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
            <p className="mt-1 text-xs text-destructive">{errors.title}</p>
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
            <p className="mt-1 text-xs text-destructive">{errors.summary}</p>
          )}
        </div>
        <div>
          <Label htmlFor="content">Full Analysis (Optional)</Label>
          <textarea
            id="content"
            className="min-h-[200px] w-full rounded-md border-2 border-border bg-background px-3 py-2 text-foreground"
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            placeholder="Detailed analysis (supports markdown)"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">Prediction Details</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="predictedOutcome">Predicted Outcome</Label>
            <Input
              id="predictedOutcome"
              value={formData.predictedOutcome}
              onChange={(e) =>
                setFormData({ ...formData, predictedOutcome: e.target.value })
              }
              placeholder="e.g., Home Win, Over 2.5, Yes"
            />
            {errors.outcome && (
              <p className="mt-1 text-xs text-destructive">{errors.outcome}</p>
            )}
          </div>
          <div>
            <Label htmlFor="matchResult">Match Result</Label>
            <Input
              id="matchResult"
              value={formData.matchResult}
              onChange={(e) =>
                setFormData({ ...formData, matchResult: e.target.value })
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
            <Label htmlFor="confidenceLevel">Confidence Level (%)</Label>
            <Input
              id="confidenceLevel"
              type="number"
              min={1}
              max={100}
              value={formData.confidenceLevel}
              onChange={(e) =>
                setFormData({ ...formData, confidenceLevel: e.target.value })
              }
              placeholder="e.g., 100"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-bold text-lg">
            Ticket Snapshots ({formData.ticketSnapshots.length}/10)
          </h3>
          <Input
            id="ticketUpload"
            type="file"
            accept="image/*"
            onChange={handleTicketSnapshotUpload}
            disabled={uploadingImage || formData.ticketSnapshots.length >= 10}
          />
        </div>
        {errors.tickets && (
          <p className="text-xs text-destructive">{errors.tickets}</p>
        )}
        {formData.ticketSnapshots.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {formData.ticketSnapshots.map((url, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-md border-2 border-border"
              >
                <img
                  src={url}
                  alt={`Ticket ${index + 1}`}
                  className="h-32 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveTicketSnapshot(index)}
                  className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">Publishing Options</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="w-full rounded-md border-2 border-border bg-background px-3 py-2 text-foreground"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
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
              className="w-full rounded-md border-2 border-border bg-background px-3 py-2 text-foreground"
              value={formData.result}
              onChange={(e) =>
                setFormData({ ...formData, result: e.target.value })
              }
            >
              <option value="pending">Pending</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="void">Cancelled/Void</option>
            </select>
          </div>
          <div>
            <Label htmlFor="publishAt">Publish Date/Time</Label>
            <Input
              id="publishAt"
              type="datetime-local"
              value={formData.publishAt}
              onChange={(e) =>
                setFormData({ ...formData, publishAt: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
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

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={formData.isVIP}
              onChange={(e) =>
                setFormData({ ...formData, isVIP: e.target.checked })
              }
              className="h-4 w-4"
            />
            VIP Only
          </label>
          <label className="hidden items-center gap-2 text-sm font-medium ">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) =>
                setFormData({ ...formData, featured: e.target.checked })
              }
              className="h-4 w-4 hidden"
            />
            Featured
          </label>
          <div className="flex items-center gap-2 ">
            <Label htmlFor="category" className="text-sm hidden">
              Category:
            </Label>
            <select
              id="category"
              className="rounded border-2 hidden border-border bg-background px-2 py-1 text-sm text-foreground"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
            >
              <option value="tip">Tip</option>
              <option value="update">Update</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting || uploadingImage}>
          {isSubmitting
            ? "Saving..."
            : submitLabel ||
              (mode === "edit" ? "Update Prediction" : "Create Prediction")}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        <span>
          Modern admin form with live uploads and responsive controls.
        </span>
      </div>
    </form>
  );
}
