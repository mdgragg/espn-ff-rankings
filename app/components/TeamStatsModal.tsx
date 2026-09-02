"use client";

import { useEffect } from "react";

import type { EspnPowerRankingTeam } from "@/lib/espn";

interface TeamStatsModalProps {
  team: EspnPowerRankingTeam;
  onClose: () => void;
  ordinal: (n: number) => string;
  formatPoints: (n: number) => string;
  resultClass: (result?: "W" | "L" | "T") => string;
}

export default function TeamStatsModal({
  team,
  onClose,
  ordinal,
  formatPoints,
  resultClass,
}: TeamStatsModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="team-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {team.logo ? (
          <img
            src={team.logo}
            alt={`${team.name} logo`}
            className="modal-hanging-logo"
          />
        ) : null}

        <div className="modal-scrollable-content">
          <div className="details-header">
            <div>
              <h3>{team.name}</h3>
              <p>{team.ownerName}</p>
            </div>
          </div>

          <h4>Season Totals</h4>

          <div className="detail-stat-row">
            <span>Record</span>
            <strong>
              {team.wins}-{team.losses}
              {team.ties ? `-${team.ties}` : ""}
            </strong>
          </div>

          <div className="detail-stat-row">
            <span>Points For</span>
            <strong>
              {formatPoints(team.pointsFor)} (
              {ordinal(team.ranking.pointsForRank)})
            </strong>
          </div>

          <div className="detail-stat-row">
            <span>Points Against</span>
            <strong>
              {formatPoints(team.pointsAgainst)} (
              {ordinal(team.ranking.pointsAgainstRank)})
            </strong>
          </div>

          <div className="detail-stat-row">
            <span>Avg Points Per Week</span>
            <strong>{formatPoints(team.avgPointsPerWeek)}</strong>
          </div>

          <div className="detail-stat-row">
            <span>Highest Week Score</span>
            <strong>
              {formatPoints(team.highestWeekScore)} (Week{" "}
              {team.highestWeekNumber})
            </strong>
          </div>

          <div className="detail-stat-row">
            <span>Recent Trend</span>
            <strong>
              {team.recentFormTrend.trend === "up"
                ? "↑"
                : team.recentFormTrend.trend === "down"
                  ? "↓"
                  : "→"}{" "}
              +{formatPoints(team.recentFormTrend.avgLast3)} avg (last 3 weeks)
            </strong>
          </div>

          <div className="detail-stat-row">
            <span>Bench Points</span>
            <strong>{formatPoints(team.benchPoints)}</strong>
          </div>

          <div className="detail-stat-row">
            <span>Strength of Schedule</span>
            <strong>{(team.strengthOfSchedule * 100).toFixed(1)}%</strong>
          </div>

          <div className="detail-stat-row">
            <span>Pickups</span>
            <strong>{team.pickupCount}</strong>
          </div>

          <div className="detail-stat-row">
            <span>Waiver Priority</span>
            <strong>#{team.waiverPriority}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
