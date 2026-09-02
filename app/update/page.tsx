"use client";

import { useEffect, useState } from "react";
import { proxyImageUrl } from "@/lib/image-proxy";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Team {
  id: number;
  name: string;
  abbrev: string;
  logo?: string;
  ownerName: string;
}

interface WeeklyData {
  team_id: number;
  week: number;
  blurb: string;
  manual_rank: number | null;
}

export default function UpdatePage() {
  const [teams, setTeams] = useState<Team[]>([]);

  const [configs, setConfigs] = useState<WeeklyData[]>([]);

  const [selectedWeek, setSelectedWeek] = useState(1);

  const [leagueBlurb, setLeagueBlurb] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (teams.length > 0) {
      loadWeek(selectedWeek);
    }
  }, [selectedWeek, teams]);

  async function loadTeams() {
    try {
      const response = await fetch("/api/espn/teams");

      if (!response.ok) {
        throw new Error("Failed to load ESPN teams");
      }

      const data = await response.json();

      setTeams(data.teams || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadWeek(week: number) {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("espn_weekly_data")
        .select("team_id, week, blurb, manual_rank, league_blurb")
        .eq("week", week);

      if (error) {
        throw error;
      }

      const leagueRow = data?.find((row: any) => row.team_id === 0);
      setLeagueBlurb(leagueRow?.league_blurb || "");

      const merged = teams.map((team) => {
        const existing = data?.find((row) => Number(row.team_id) === team.id);

        return {
          team_id: team.id,
          week,
          blurb: existing?.blurb || "",
          manual_rank: existing?.manual_rank ?? null,
        };
      });

      setConfigs(sortConfigs(merged));
    } catch (error) {
      console.error("Failed to load weekly data:", error);

      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }

  function sortConfigs(list: WeeklyData[]) {
    return [...list].sort((a, b) => {
      if (a.manual_rank != null && b.manual_rank != null) {
        return a.manual_rank - b.manual_rank;
      }

      if (a.manual_rank != null) {
        return -1;
      }

      if (b.manual_rank != null) {
        return 1;
      }

      return a.team_id - b.team_id;
    });
  }

  function changeBlurb(teamId: number, value: string) {
    setConfigs((prev) =>
      prev.map((config) =>
        config.team_id === teamId
          ? {
              ...config,
              blurb: value,
            }
          : config,
      ),
    );
  }

  function changeRank(teamId: number, value: string) {
    const rank = value === "" ? null : Number(value);

    setConfigs((prev) => {
      const updated = prev.map((config) => ({
        ...config,
      }));

      const target = updated.find((config) => config.team_id === teamId);

      if (!target) {
        return prev;
      }

      target.manual_rank = rank;

      return sortConfigs(updated);
    });
  }

  async function saveAll() {
    setSaving(true);

    try {
      const payload = configs.map((config) => ({
        week: config.week,
        team_id: config.team_id,
        blurb: config.blurb,
        manual_rank: config.manual_rank,
      }));

      if (leagueBlurb.trim()) {
        payload.push({
          week: selectedWeek,
          team_id: 0,
          blurb: "",
          manual_rank: null,
          league_blurb: leagueBlurb,
        } as any);
      }

      const { error } = await supabase
        .from("espn_weekly_data")
        .upsert(payload, {
          onConflict: "team_id,week",
        });

      if (error) {
        throw error;
      }

      alert("ESPN weekly updates saved!");

      await loadWeek(selectedWeek);
    } catch (error) {
      console.error("Save failed:", error);

      alert("Save failed. Check the console.");
    } finally {
      setSaving(false);
    }
  }

  async function resetRanks() {
    if (!confirm(`Reset all manual rankings for Week ${selectedWeek}?`)) {
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("espn_weekly_data")
        .update({
          manual_rank: null,
        })
        .eq("week", selectedWeek);

      if (error) {
        throw error;
      }

      await loadWeek(selectedWeek);
    } catch (error) {
      console.error("Reset failed:", error);

      alert("Reset failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="full-screen-loading">
        <div className="loading-bar">
          <div className="loading-bar-progress" />
        </div>

        <p>Loading ESPN teams...</p>
      </div>
    );
  }

  return (
    <main className="power-page">
      <header className="power-header">
        <div className="league-title">
          <h1>Update Power Rankings</h1>
        </div>

        <div className="update-controls">
          <div>
            <label>Week</label>

            <select
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(Number(event.target.value))}
            >
              {Array.from(
                {
                  length: 18,
                },
                (_, i) => i + 1,
              ).map((week) => (
                <option key={week} value={week}>
                  Week {week}
                </option>
              ))}
            </select>
          </div>

          <div className="update-actions">
            <button onClick={saveAll} disabled={saving}>
              {saving ? "Saving..." : "SAVE"}
            </button>

            <button
              onClick={resetRanks}
              disabled={saving}
              className="reset-button"
            >
              ESPN RANKINGS
            </button>
          </div>
        </div>
        <section className="weekly-update-section">
          {/* <h2>Weekly Update</h2> */}
          <textarea
            value={leagueBlurb}
            onChange={(event) => setLeagueBlurb(event.target.value)}
            placeholder="Weekly update (optional)"
          />
        </section>
      </header>

      <div className="update-grid">
        {configs.map((config) => {
          const team = teams.find((team) => team.id === config.team_id);

          if (!team) {
            return null;
          }

          return (
            <div key={team.id} className="update-team-card">
              <div className="update-team-header">
                <div>
                  <h2>{team.name}</h2>

                  <p>{team.ownerName}</p>
                </div>
              </div>

              <label>Rank</label>

              <input
                type="number"
                min={1}
                max={teams.length}
                value={config.manual_rank ?? ""}
                onChange={(event) => changeRank(team.id, event.target.value)}
                placeholder="ESPN rank"
              />

              <label>Weekly Blurb</label>

              <textarea
                value={config.blurb}
                onChange={(event) => changeBlurb(team.id, event.target.value)}
                placeholder="Team's weekly update..."
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
