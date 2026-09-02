"use client";

import { useState } from "react";

import TeamStatsModal from "./TeamStatsModal";

import type { EspnPowerRankingTeam } from "@/lib/espn";

interface Props {
  team: EspnPowerRankingTeam;
  ordinal: (n: number) => string;
  formatPoints: (n: number) => string;
  resultClass: (result?: "W" | "L" | "T") => string;
}

export default function TeamStatsButton({
  team,
  ordinal,
  formatPoints,
  resultClass,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="team-stats-button"
        onClick={() => setOpen(true)}
      >
        View Team Stats
      </button>

      {open && (
        <TeamStatsModal
          team={team}
          onClose={() => setOpen(false)}
          ordinal={ordinal}
          formatPoints={formatPoints}
          resultClass={resultClass}
        />
      )}
    </>
  );
}
