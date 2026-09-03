// lib/espn.ts

import { supabase } from "@/lib/supabase";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface EspnTeam {
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
}

export interface EspnMember {
  id: string;
  firstName: string;
  lastName: string;
}

export interface EspnMatchupSide {
  teamId: number;
  totalPoints: number;
}

export interface EspnMatchup {
  id: number;
  matchupPeriodId: number;
  home: EspnMatchupSide;
  away: EspnMatchupSide;
  winner: "HOME" | "AWAY" | "UNDECIDED";
}

export interface EspnTeamRanking {
  powerRank: number;
  winsRank: number;
  pointsForRank: number;
  pointsAgainstRank: number;
  strengthOfScheduleRank: number;
  avgPointsPerWeekRank: number;
  highestWeekScoreRank: number;
  benchPointsRank: number;
  pickupCountRank: number;
  regularSeasonPointsForRank: number;
  regularSeasonPointsAgainstRank: number;
  regularSeasonAvgPointsPerWeekRank: number;
  regularSeasonHighestWeekScoreRank: number;
}

export interface EspnLastMatchup {
  opponentId: number;
  opponentName: string;
  opponentLogo?: string;
  teamPoints: number;
  opponentPoints: number;
  result: "W" | "L" | "T";
}

export interface EspnNextMatchup {
  opponentId: number;
  opponentName: string;
  opponentLogo?: string;
}

export interface EspnPowerRankingTeam extends EspnTeam {
  ranking: EspnTeamRanking;
  lastMatchup?: EspnLastMatchup;
  nextMatchup?: EspnNextMatchup;
  blurb: string;
  manualRank?: number | null;
  benchPoints: number;
  avgPointsPerWeek: number;
  strengthOfSchedule: number;
  pickupCount: number;
  waiverPriority: number;
  recentFormTrend: {
    weekScores: Array<{ week: number; points: number }>;
    avgLast3: number;
    trend: "up" | "down" | "stable";
    change: number;
  };
  highestWeekScore: number;
  highestWeekNumber: number;
  regularSeasonPointsFor: number;
  regularSeasonPointsAgainst: number;
  regularSeasonHighestWeekScore: number;
  regularSeasonHighestWeekNumber: number;
  regularSeasonAvgPointsPerWeek: number;
  regularSeasonRecentFormTrend: {
    weekScores: Array<{ week: number; points: number }>;
    avgLast3: number;
    trend: "up" | "down" | "stable";
    change: number;
  };
}

export interface EspnLeagueData {
  leagueName: string;
  season: number;
  currentWeek: number;
  teams: EspnPowerRankingTeam[];
  members: EspnMember[];
  weeks: number;
}

// ------------------------------------------------------------
// Environment
// ------------------------------------------------------------

function getEnvVar(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

// ------------------------------------------------------------
// ESPN API
// ------------------------------------------------------------

function buildLeagueUrl(
  leagueId: string,
  season: string,
  views: string[],
  params?: Record<string, string | number | undefined>,
) {
  const url = new URL(
    `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`,
  );

  for (const view of views) {
    url.searchParams.append("view", view);
  }

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function fetchEspn(url: string, swid: string, s2: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      Cookie: `espn_s2=${s2}; SWID=${swid}`,
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok || !contentType.includes("application/json")) {
    const body = await res.text();

    throw new Error(
      `ESPN API did not return JSON (status ${res.status} ${res.statusText}, ` +
        `content-type: ${contentType || "unknown"}).\n` +
        `First 300 chars:\n${body.slice(0, 300)}`,
    );
  }

  return res.json();
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getOwnerName(team: any, members: EspnMember[]): string {
  const ownerIds: string[] = team.owners || [];

  const owners = ownerIds
    .map((ownerId) => members.find((member) => member.id === ownerId))
    .filter(Boolean) as EspnMember[];

  if (!owners.length) {
    return "Unknown Owner";
  }

  return owners
    .map((owner) => `${owner.firstName} ${owner.lastName}`.trim())
    .join(", ");
}

function getMatchupForTeam(
  schedule: EspnMatchup[],
  teamId: number,
): EspnMatchup | undefined {
  return schedule.find(
    (matchup) =>
      matchup.home?.teamId === teamId || matchup.away?.teamId === teamId,
  );
}

function getOpponent(
  matchup: EspnMatchup,
  teamId: number,
): EspnMatchupSide | undefined {
  if (matchup.home?.teamId === teamId) {
    return matchup.away;
  }

  if (matchup.away?.teamId === teamId) {
    return matchup.home;
  }

  return undefined;
}

function getTeamSide(
  matchup: EspnMatchup,
  teamId: number,
): EspnMatchupSide | undefined {
  if (matchup.home?.teamId === teamId) {
    return matchup.home;
  }

  if (matchup.away?.teamId === teamId) {
    return matchup.away;
  }

  return undefined;
}

function computeRank(
  teams: EspnPowerRankingTeam[],
  valueGetter: (team: EspnPowerRankingTeam) => number,
): Record<number, number> {
  const sorted = [...teams].sort((a, b) => valueGetter(b) - valueGetter(a));

  const ranks: Record<number, number> = {};

  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];

    if (i > 0 && valueGetter(current) === valueGetter(previous)) {
      ranks[current.id] = ranks[previous.id];
    } else {
      ranks[current.id] = currentRank;
    }

    currentRank++;
  }

  return ranks;
}

// ------------------------------------------------------------
// Fetch weekly Supabase data
// ------------------------------------------------------------

async function getWeeklyData(week: number) {
  const { data, error } = await supabase
    .from("espn_weekly_data")
    .select("team_id, blurb, manual_rank")
    .eq("week", week);

  if (error) {
    console.error("Failed to load ESPN weekly data:", error);
    return [];
  }

  return data || [];
}

// ------------------------------------------------------------
// Main ESPN loader
// ------------------------------------------------------------

export async function fetchEspnLeague(
  requestedWeek?: number,
): Promise<EspnLeagueData> {
  const leagueId = getEnvVar("ESPN_LEAGUE_ID");
  const season = getEnvVar("ESPN_SEASON");
  const swid = getEnvVar("ESPN_SWID");
  const s2 = getEnvVar("ESPN_S2");

  const baseUrl = buildLeagueUrl(leagueId, season, [
    "mTeam",
    "mStandings",
    "mSettings",
    "mScoreboard",
  ]);

  const baseData = await fetchEspn(baseUrl, swid, s2);

  const members: EspnMember[] = (baseData.members || []).map((member: any) => ({
    id: member.id,
    firstName: member.firstName || "",
    lastName: member.lastName || "",
  }));

  // ----------------------------------------------------------
  // ESPN teams
  // ----------------------------------------------------------

  const teams: EspnPowerRankingTeam[] = (baseData.teams || []).map(
    (team: any) => ({
      id: Number(team.id),

      name:
        team.name?.trim() ||
        `${team.location || ""} ${team.nickname || ""}`.trim() ||
        `Team ${team.id}`,

      abbrev: team.abbrev || "",

      logo: team.logo,

      wins: team.record?.overall?.wins ?? 0,

      losses: team.record?.overall?.losses ?? 0,

      ties: team.record?.overall?.ties ?? 0,

      pointsFor: Number(team.record?.overall?.pointsFor ?? 0),

      pointsAgainst: Number(team.record?.overall?.pointsAgainst ?? 0),

      ownerIds: team.owners || [],

      ownerName: getOwnerName(team, members),

      blurb: "",

      manualRank: null,

      ranking: {
        powerRank: 0,
        winsRank: 0,
        pointsForRank: 0,
        pointsAgainstRank: 0,
        strengthOfScheduleRank: 0,
        avgPointsPerWeekRank: 0,
        highestWeekScoreRank: 0,
        benchPointsRank: 0,
        pickupCountRank: 0,
        regularSeasonPointsForRank: 0,
        regularSeasonPointsAgainstRank: 0,
        regularSeasonAvgPointsPerWeekRank: 0,
        regularSeasonHighestWeekScoreRank: 0,
      },

      benchPoints: 0,
      avgPointsPerWeek: 0,
      strengthOfSchedule: 0,
      pickupCount: 0,
      waiverPriority: team.waiverRank ?? 0,
      recentFormTrend: {
        weekScores: [],
        avgLast3: 0,
        trend: "stable" as const,
        change: 0,
      },
      highestWeekScore: 0,
      highestWeekNumber: 0,
      regularSeasonPointsFor: 0,
      regularSeasonPointsAgainst: 0,
      regularSeasonHighestWeekScore: 0,
      regularSeasonHighestWeekNumber: 0,
      regularSeasonAvgPointsPerWeek: 0,
      regularSeasonRecentFormTrend: {
        weekScores: [],
        avgLast3: 0,
        trend: "stable" as const,
        change: 0,
      },
    }),
  );

  // ----------------------------------------------------------
  // Current week
  // ----------------------------------------------------------

  const currentWeek =
    Number(baseData.scoringPeriodId) ||
    Number(baseData.status?.currentScoringPeriod) ||
    1;

  const week = requestedWeek && requestedWeek > 0 ? requestedWeek : currentWeek;

  // ----------------------------------------------------------
  // Helper to fetch transaction data for acquisition count
  // ----------------------------------------------------------

  async function getTransactionData(): Promise<Map<number, number>> {
    try {
      const pickupCounts = new Map<number, number>();

      const currentWeek = Number(baseData.scoringPeriodId) || 1;
      const weeksToCheck = Math.min(currentWeek, week);

      for (let w = 1; w <= weeksToCheck; w++) {
        const transactionUrl = buildLeagueUrl(leagueId, season, ["mTransactions2"], {
          scoringPeriodId: w,
        });

        const transactionData = await fetchEspn(transactionUrl, swid, s2);
        const transactions = transactionData.transactions || [];

        for (const transaction of transactions) {
          if (transaction.status === "EXECUTED") {
            const teamId = Number(transaction.teamId);

            if (transaction.type === "FREEAGENT" || transaction.type === "WAIVER") {
              pickupCounts.set(teamId, (pickupCounts.get(teamId) || 0) + 1);
            }
          }
        }
      }

      return pickupCounts;
    } catch (error) {
      console.warn("Failed to fetch transaction data:", error);
      return new Map();
    }
  }

  // ----------------------------------------------------------
  // Load weekly blurbs/rank overrides
  // ----------------------------------------------------------

  const weeklyData = await getWeeklyData(week);

  for (const team of teams) {
    const weekly = weeklyData.find(
      (row: any) => Number(row.team_id) === Number(team.id),
    );

    if (weekly) {
      team.blurb = weekly.blurb || "";
      team.manualRank = weekly.manual_rank ?? null;
    }
  }

  // ----------------------------------------------------------
  // Fetch all historical matchups for stats
  // ----------------------------------------------------------

  const allWeeklyScores = new Map<
    number,
    Array<{ week: number; points: number }>
  >();
  const allHighestScores = new Map<number, { week: number; points: number }>();

  async function loadAllWeeklyScores() {
    const weeklyScores = new Map<
      number,
      Array<{ week: number; points: number }>
    >();
    const highestScores = new Map<number, { week: number; points: number }>();
    const weeklyOpponentScores = new Map<
      number,
      Array<{ week: number; points: number }>
    >();

    for (let w = 1; w < currentWeek; w++) {
      try {
        const matchupUrl = buildLeagueUrl(leagueId, season, ["mMatchupScore"], {
          matchupPeriodId: w,
        });

        const matchupData = await fetchEspn(matchupUrl, swid, s2);

        const schedule: EspnMatchup[] = (matchupData.schedule || [])
          .filter((matchup: any) => Number(matchup.matchupPeriodId) === w)
          .map((matchup: any) => ({
            id: Number(matchup.id),
            matchupPeriodId: Number(matchup.matchupPeriodId),
            home: {
              teamId: Number(matchup.home?.teamId),
              totalPoints: Number(matchup.home?.totalPoints ?? 0),
            },
            away: {
              teamId: Number(matchup.away?.teamId),
              totalPoints: Number(matchup.away?.totalPoints ?? 0),
            },
            winner:
              matchup.winner === "HOME" || matchup.winner === "AWAY"
                ? matchup.winner
                : "UNDECIDED",
          }));

        for (const matchup of schedule) {
          // Home team
          const homeTeamId = matchup.home.teamId;
          const homePoints = matchup.home.totalPoints;
          if (!weeklyScores.has(homeTeamId)) {
            weeklyScores.set(homeTeamId, []);
          }
          weeklyScores.get(homeTeamId)!.push({ week: w, points: homePoints });

          if (
            !highestScores.has(homeTeamId) ||
            homePoints > highestScores.get(homeTeamId)!.points
          ) {
            highestScores.set(homeTeamId, { week: w, points: homePoints });
          }

          // Home team's opponent points (points against)
          const awayPoints = matchup.away.totalPoints;
          if (!weeklyOpponentScores.has(homeTeamId)) {
            weeklyOpponentScores.set(homeTeamId, []);
          }
          weeklyOpponentScores
            .get(homeTeamId)!
            .push({ week: w, points: awayPoints });

          // Away team
          const awayTeamId = matchup.away.teamId;
          if (!weeklyScores.has(awayTeamId)) {
            weeklyScores.set(awayTeamId, []);
          }
          weeklyScores.get(awayTeamId)!.push({ week: w, points: awayPoints });

          if (
            !highestScores.has(awayTeamId) ||
            awayPoints > highestScores.get(awayTeamId)!.points
          ) {
            highestScores.set(awayTeamId, { week: w, points: awayPoints });
          }

          // Away team's opponent points (points against)
          if (!weeklyOpponentScores.has(awayTeamId)) {
            weeklyOpponentScores.set(awayTeamId, []);
          }
          weeklyOpponentScores
            .get(awayTeamId)!
            .push({ week: w, points: homePoints });
        }
      } catch (error) {
        console.warn(`Failed to load matchups for week ${w}:`, error);
      }
    }

    return { weeklyScores, highestScores, weeklyOpponentScores };
  }

  // ----------------------------------------------------------
  // Matchups
  // ----------------------------------------------------------

  const matchupCache = new Map<number, EspnMatchup[]>();

  async function getMatchups(matchupPeriodId: number): Promise<EspnMatchup[]> {
    if (matchupCache.has(matchupPeriodId)) {
      return matchupCache.get(matchupPeriodId)!;
    }

    const matchupUrl = buildLeagueUrl(leagueId, season, ["mMatchupScore"], {
      matchupPeriodId,
    });

    const matchupData = await fetchEspn(matchupUrl, swid, s2);

    const schedule: EspnMatchup[] = (matchupData.schedule || [])
      .filter(
        (matchup: any) => Number(matchup.matchupPeriodId) === matchupPeriodId,
      )
      .map((matchup: any) => ({
        id: Number(matchup.id),
        matchupPeriodId: Number(matchup.matchupPeriodId),

        home: {
          teamId: Number(matchup.home?.teamId),
          totalPoints: Number(matchup.home?.totalPoints ?? 0),
        },

        away: {
          teamId: Number(matchup.away?.teamId),
          totalPoints: Number(matchup.away?.totalPoints ?? 0),
        },

        winner:
          matchup.winner === "HOME" || matchup.winner === "AWAY"
            ? matchup.winner
            : "UNDECIDED",
      }));

    matchupCache.set(matchupPeriodId, schedule);

    return schedule;
  }

  const previousWeek = week > 1 ? week - 1 : undefined;

  const nextWeek = week + 1;

  const [currentMatchups, previousMatchups, nextMatchups] = await Promise.all([
    getMatchups(week),

    previousWeek ? getMatchups(previousWeek) : Promise.resolve([]),

    getMatchups(nextWeek),
  ]);

  // ----------------------------------------------------------
  // Matchup information
  // ----------------------------------------------------------

  for (const team of teams) {
    if (previousWeek) {
      const previousMatchup = getMatchupForTeam(previousMatchups, team.id);

      if (previousMatchup) {
        const teamSide = getTeamSide(previousMatchup, team.id);

        const opponentSide = getOpponent(previousMatchup, team.id);

        if (teamSide && opponentSide) {
          let result: "W" | "L" | "T";

          if (teamSide.totalPoints > opponentSide.totalPoints) {
            result = "W";
          } else if (teamSide.totalPoints < opponentSide.totalPoints) {
            result = "L";
          } else {
            result = "T";
          }

          const opponent = teams.find(
            (other) => other.id === opponentSide.teamId,
          );

          team.lastMatchup = {
            opponentId: opponentSide.teamId,
            opponentName: opponent?.name || `Team ${opponentSide.teamId}`,
            opponentLogo: opponent?.logo,
            teamPoints: teamSide.totalPoints,
            opponentPoints: opponentSide.totalPoints,
            result,
          };
        }
      }
    }

    const nextMatchup = getMatchupForTeam(nextMatchups, team.id);

    if (nextMatchup) {
      const opponentSide = getOpponent(nextMatchup, team.id);

      if (opponentSide) {
        const opponent = teams.find(
          (other) => other.id === opponentSide.teamId,
        );

        team.nextMatchup = {
          opponentId: opponentSide.teamId,

          opponentName: opponent?.name || `Team ${opponentSide.teamId}`,

          opponentLogo: opponent?.logo,
        };
      }
    }
  }

  // ----------------------------------------------------------
  // Calculate advanced team stats
  // ----------------------------------------------------------

  const { weeklyScores, highestScores, weeklyOpponentScores } =
    await loadAllWeeklyScores();
  const pickupCounts = await getTransactionData();

  const REGULAR_SEASON_WEEKS = 13;

  for (const team of teams) {
    // Highest weekly score (all weeks)
    if (highestScores.has(team.id)) {
      const high = highestScores.get(team.id)!;
      team.highestWeekScore = high.points;
      team.highestWeekNumber = high.week;
    }

    // Regular season highest weekly score (weeks 1-13 only)
    if (weeklyScores.has(team.id)) {
      const regularSeasonScores = weeklyScores
        .get(team.id)!
        .filter((s) => s.week <= REGULAR_SEASON_WEEKS);
      if (regularSeasonScores.length > 0) {
        const regularSeasonHigh = regularSeasonScores.reduce((prev, current) =>
          current.points > prev.points ? current : prev,
        );
        team.regularSeasonHighestWeekScore = regularSeasonHigh.points;
        team.regularSeasonHighestWeekNumber = regularSeasonHigh.week;

        // Regular season points for
        team.regularSeasonPointsFor = regularSeasonScores.reduce(
          (sum, s) => sum + s.points,
          0,
        );
      }
    }

    // Regular season points against
    if (weeklyOpponentScores.has(team.id)) {
      const regularSeasonOpponentScores = weeklyOpponentScores
        .get(team.id)!
        .filter((s) => s.week <= REGULAR_SEASON_WEEKS);
      if (regularSeasonOpponentScores.length > 0) {
        team.regularSeasonPointsAgainst = regularSeasonOpponentScores.reduce(
          (sum, s) => sum + s.points,
          0,
        );
      }
    }

    // Weekly scores and recent form trend
    if (weeklyScores.has(team.id)) {
      const scores = weeklyScores.get(team.id)!;
      team.recentFormTrend.weekScores = scores;

      if (scores.length >= 1) {
        // Average points per week
        team.avgPointsPerWeek =
          scores.reduce((sum, s) => sum + s.points, 0) / scores.length;
      }

      // Recent form (last 3 weeks)
      const recentScores = scores.slice(-3);
      if (recentScores.length > 0) {
        const recentAvg =
          recentScores.reduce((sum, s) => sum + s.points, 0) /
          recentScores.length;
        team.recentFormTrend.avgLast3 = recentAvg;

        // Determine trend
        if (recentScores.length >= 2) {
          const oldScores = scores.slice(-6, -3);
          if (oldScores.length > 0) {
            const oldAvg =
              oldScores.reduce((sum, s) => sum + s.points, 0) / oldScores.length;
            team.recentFormTrend.change = recentAvg - oldAvg;
            if (recentAvg > oldAvg + 5) {
              team.recentFormTrend.trend = "up";
            } else if (recentAvg < oldAvg - 5) {
              team.recentFormTrend.trend = "down";
            }
          }
        }
      }

      // Regular season stats (weeks 1-13)
      const regularSeasonScores = scores.filter(
        (s) => s.week <= REGULAR_SEASON_WEEKS,
      );
      team.regularSeasonRecentFormTrend.weekScores = regularSeasonScores;

      if (regularSeasonScores.length >= 1) {
        team.regularSeasonAvgPointsPerWeek =
          regularSeasonScores.reduce((sum, s) => sum + s.points, 0) /
          regularSeasonScores.length;
      }

      // Regular season recent form (last 3 weeks of regular season)
      const regularSeasonRecentScores = regularSeasonScores.slice(-3);
      if (regularSeasonRecentScores.length > 0) {
        const recentAvg =
          regularSeasonRecentScores.reduce((sum, s) => sum + s.points, 0) /
          regularSeasonRecentScores.length;
        team.regularSeasonRecentFormTrend.avgLast3 = recentAvg;

        // Determine trend
        if (regularSeasonRecentScores.length >= 2) {
          const oldScores = regularSeasonScores.slice(-6, -3);
          if (oldScores.length > 0) {
            const oldAvg =
              oldScores.reduce((sum, s) => sum + s.points, 0) / oldScores.length;
            team.regularSeasonRecentFormTrend.change = recentAvg - oldAvg;
            if (recentAvg > oldAvg + 5) {
              team.regularSeasonRecentFormTrend.trend = "up";
            } else if (recentAvg < oldAvg - 5) {
              team.regularSeasonRecentFormTrend.trend = "down";
            }
          }
        }
      }
    }

    // Pickup count
    team.pickupCount = pickupCounts.get(team.id) || 0;

    // Strength of schedule: average win % of all remaining opponents
    async function getRemainingSchedule(): Promise<number[]> {
      const opponentIds: number[] = [];
      for (let w = week; w <= week + 5; w++) {
        try {
          const matchupUrl = buildLeagueUrl(leagueId, season, ["mMatchupScore"], {
            matchupPeriodId: w,
          });
          const matchupData = await fetchEspn(matchupUrl, swid, s2);
          const schedule = matchupData.schedule || [];
          const teamMatchup = schedule.find(
            (m: any) =>
              Number(m.home?.teamId) === team.id || Number(m.away?.teamId) === team.id,
          );
          if (teamMatchup) {
            const isHome = Number(teamMatchup.home?.teamId) === team.id;
            const opponentId = isHome
              ? Number(teamMatchup.away?.teamId)
              : Number(teamMatchup.home?.teamId);
            opponentIds.push(opponentId);
          }
        } catch (error) {
          // Skip if week schedule not available
        }
      }
      return opponentIds;
    }

    const remainingSchedule = await getRemainingSchedule();
    if (remainingSchedule.length > 0) {
      const opponentWinPcts = remainingSchedule
        .map((oppId) => teams.find((t) => t.id === oppId))
        .filter(Boolean)
        .map((opponent) => {
          const totalGames =
            opponent!.wins + opponent!.losses + opponent!.ties;
          return totalGames > 0 ? opponent!.wins / totalGames : 0.5;
        });

      if (opponentWinPcts.length > 0) {
        team.strengthOfSchedule =
          opponentWinPcts.reduce((a, b) => a + b, 0) / opponentWinPcts.length;
      }
    }

    // Bench points (simplified: estimate based on points for)
    // Note: Full calculation would need mBoxscore data
    team.benchPoints = Math.max(0, team.pointsFor * 0.1);
  }

  // ----------------------------------------------------------
  // Default power ranking
  // ----------------------------------------------------------

  const rankedTeams = [...teams].sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    if (b.pointsFor !== a.pointsFor) {
      return b.pointsFor - a.pointsFor;
    }

    if (a.pointsAgainst !== b.pointsAgainst) {
      return a.pointsAgainst - b.pointsAgainst;
    }

    return a.name.localeCompare(b.name);
  });

  rankedTeams.forEach((team, index) => {
    team.ranking.powerRank = index + 1;
  });

  // ----------------------------------------------------------
  // Statistical ranks
  // ----------------------------------------------------------

  const winsRanks = computeRank(teams, (team) => team.wins);

  const pointsForRanks = computeRank(teams, (team) => team.pointsFor);

  const pointsAgainstSorted = [...teams].sort(
    (a, b) => a.pointsAgainst - b.pointsAgainst,
  );

  const pointsAgainstRanks: Record<number, number> = {};

  let pointsAgainstRank = 1;

  for (let i = 0; i < pointsAgainstSorted.length; i++) {
    const current = pointsAgainstSorted[i];

    const previous = pointsAgainstSorted[i - 1];

    if (i > 0 && current.pointsAgainst === previous.pointsAgainst) {
      pointsAgainstRanks[current.id] = pointsAgainstRanks[previous.id];
    } else {
      pointsAgainstRanks[current.id] = pointsAgainstRank;
    }

    pointsAgainstRank++;
  }

  // Strength of schedule rank (lower SOS = easier = rank 1)
  const sosSorted = [...teams].sort(
    (a, b) => a.strengthOfSchedule - b.strengthOfSchedule,
  );

  const sosRanks: Record<number, number> = {};

  let sosRank = 1;

  for (let i = 0; i < sosSorted.length; i++) {
    const current = sosSorted[i];

    const previous = sosSorted[i - 1];

    if (i > 0 && current.strengthOfSchedule === previous.strengthOfSchedule) {
      sosRanks[current.id] = sosRanks[previous.id];
    } else {
      sosRanks[current.id] = sosRank;
    }

    sosRank++;
  }

  // Calculate remaining ranks
  const avgPointsPerWeekRanks = computeRank(
    teams,
    (team) => team.avgPointsPerWeek,
  );
  const highestWeekScoreRanks = computeRank(
    teams,
    (team) => team.highestWeekScore,
  );
  const benchPointsRanks = computeRank(teams, (team) => team.benchPoints);
  const pickupCountRanks = computeRank(teams, (team) => team.pickupCount);

  // Regular season ranks
  const regularSeasonPointsForRanks = computeRank(
    teams,
    (team) => team.regularSeasonPointsFor,
  );
  const regularSeasonPointsAgainstSorted = [...teams].sort(
    (a, b) => a.regularSeasonPointsAgainst - b.regularSeasonPointsAgainst,
  );
  const regularSeasonPointsAgainstRanks: Record<number, number> = {};
  let regularSeasonPARank = 1;
  for (let i = 0; i < regularSeasonPointsAgainstSorted.length; i++) {
    const current = regularSeasonPointsAgainstSorted[i];
    const previous = regularSeasonPointsAgainstSorted[i - 1];
    if (
      i > 0 &&
      current.regularSeasonPointsAgainst === previous.regularSeasonPointsAgainst
    ) {
      regularSeasonPointsAgainstRanks[current.id] =
        regularSeasonPointsAgainstRanks[previous.id];
    } else {
      regularSeasonPointsAgainstRanks[current.id] = regularSeasonPARank;
    }
    regularSeasonPARank++;
  }

  const regularSeasonAvgPointsPerWeekRanks = computeRank(
    teams,
    (team) => team.regularSeasonAvgPointsPerWeek,
  );
  const regularSeasonHighestWeekScoreRanks = computeRank(
    teams,
    (team) => team.regularSeasonHighestWeekScore,
  );

  teams.forEach((team) => {
    team.ranking.winsRank = winsRanks[team.id];
    team.ranking.pointsForRank = pointsForRanks[team.id];
    team.ranking.pointsAgainstRank = pointsAgainstRanks[team.id];
    team.ranking.strengthOfScheduleRank = sosRanks[team.id];
    team.ranking.avgPointsPerWeekRank = avgPointsPerWeekRanks[team.id];
    team.ranking.highestWeekScoreRank = highestWeekScoreRanks[team.id];
    team.ranking.benchPointsRank = benchPointsRanks[team.id];
    team.ranking.pickupCountRank = pickupCountRanks[team.id];
    team.ranking.regularSeasonPointsForRank =
      regularSeasonPointsForRanks[team.id];
    team.ranking.regularSeasonPointsAgainstRank =
      regularSeasonPointsAgainstRanks[team.id];
    team.ranking.regularSeasonAvgPointsPerWeekRank =
      regularSeasonAvgPointsPerWeekRanks[team.id];
    team.ranking.regularSeasonHighestWeekScoreRank =
      regularSeasonHighestWeekScoreRanks[team.id];
  });

  // ----------------------------------------------------------
  // Apply manual rankings
  // ----------------------------------------------------------

  const hasManualRanks = teams.some((team) => team.manualRank != null);

  if (hasManualRanks) {
    teams.sort((a, b) => {
      const aRank = a.manualRank ?? 999;

      const bRank = b.manualRank ?? 999;

      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return a.ranking.powerRank - b.ranking.powerRank;
    });

    teams.forEach((team, index) => {
      team.ranking.powerRank = index + 1;
    });
  } else {
    teams.splice(0, teams.length, ...rankedTeams);
  }

  // ----------------------------------------------------------
  // Number of weeks
  // ----------------------------------------------------------

  const matchupPeriods = baseData.settings?.scheduleSettings?.matchupPeriods;

  let weeks = 18;

  if (Array.isArray(matchupPeriods)) {
    weeks = matchupPeriods.length;
  } else if (matchupPeriods && typeof matchupPeriods === "object") {
    const ids = Object.keys(matchupPeriods).map(Number).filter(Number.isFinite);

    if (ids.length) {
      weeks = Math.max(...ids);
    }
  }

  return {
    leagueName: baseData.settings?.name || "ESPN Fantasy Football League",

    season: Number(baseData.seasonId) || Number(season),

    currentWeek,

    teams,

    members,

    weeks,
  };
}
