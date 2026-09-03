"use client";

import { useState } from "react";
import { proxyImageUrl } from "@/lib/image-proxy";
import TeamStatsModal from "./TeamStatsModal";

interface Team {
  id: number;
  name: string;
  abbrev: string;
  logo?: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  ownerIds: string[];
  ownerName: string;

  ranking: {
    powerRank: number;
    winsRank: number;
    pointsForRank: number;
    pointsAgainstRank: number;
  };

  lastMatchup?: {
    opponentId: number;
    opponentName: string;
    opponentLogo?: string;
    teamPoints: number;
    opponentPoints: number;
    result: "W" | "L" | "T";
  };

  nextMatchup?: {
    opponentId: number;
    opponentName: string;
    opponentLogo?: string;
  };
}

interface TeamCardProps {
  team: Team & { displayRank?: number };
  blurb?: string;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) {
    return `${n}th`;
  }

  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatPoints(value: number): string {
  return Number(value || 0).toFixed(2);
}

function resultClass(result?: "W" | "L" | "T"): string {
  if (result === "W") return "result-win";
  if (result === "L") return "result-loss";
  return "result-tie";
}

export default function TeamCard({ team, blurb }: TeamCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const lastMatchup = team.lastMatchup;
  const nextMatchup = team.nextMatchup;

  const isWeeklyWinner = lastMatchup?.result === "W";

  return (
    <>
      <article
        id={`team-${team.id}`}
        className={`team-card ${isWeeklyWinner ? "weekly-winner" : ""}`}
      >
        <div className="rank">{team.ranking.powerRank}</div>

        <div className="team-logo-wrapper">
          {team.logo ? (
            <img
              src={proxyImageUrl(team.logo)}
              alt={`${team.name} logo`}
              className="team-logo"
            />
          ) : (
            <div className="team-logo-placeholder">
              {team.abbrev || team.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="team-main">
          <div className="team-heading">
            <div>
              <h2>
                {team.name}{" "}
                <span className="record">
                  ({team.wins}-{team.losses}
                  {team.ties ? `-${team.ties}` : ""})
                </span>
              </h2>

              <div className="owner">{team.ownerName}</div>
            </div>

            {/* {isWeeklyWinner && (
              <span className="winner-badge">WEEKLY WINNER</span>
            )} */}
          </div>

          {blurb?.trim() && <div className="team-blurb">{blurb}</div>}

          <div className="stats-matchup-row">
            <button
              type="button"
              className="team-stats-button"
              onClick={() => setModalOpen(true)}
            >
              View Team Stats
            </button>
            <div className="matchup-row">
              {lastMatchup ? (
                <span>
                  Last Week:{" "}
                  <b className={resultClass(lastMatchup.result)}>
                    {lastMatchup.result === "W"
                      ? "Win"
                      : lastMatchup.result === "L"
                        ? "Loss"
                        : "Tie"}
                  </b>{" "}
                  vs <strong>{lastMatchup.opponentName}</strong> (
                  {formatPoints(lastMatchup.teamPoints)}-
                  {formatPoints(lastMatchup.opponentPoints)})
                </span>
              ) : (
                <span>Last Week: —</span>
              )}

              <span className="separator">|</span>

              {nextMatchup ? (
                <span>
                  Next Week: <strong>{nextMatchup.opponentName}</strong>
                </span>
              ) : (
                <span>Next Week: —</span>
              )}
            </div>
          </div>
        </div>
      </article>

      {modalOpen && (
        <TeamStatsModal
          team={
            {
              ...team,
              logo: proxyImageUrl(team.logo),
            } as Parameters<typeof TeamStatsModal>[0]["team"]
          }
          onClose={() => setModalOpen(false)}
          ordinal={ordinal}
          formatPoints={formatPoints}
          resultClass={resultClass}
        />
      )}
    </>
  );
}
