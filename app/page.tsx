import { fetchEspnLeague } from "@/lib/espn";
import { supabase } from "@/lib/supabase";
import { proxyImageUrl } from "@/lib/image-proxy";
import TeamCard from "./components/TeamCard";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{
    week?: string;
  }>;
}

interface WeeklyData {
  team_id?: number;
  week: number;
  blurb?: string;
  manual_rank?: number | null;
  league_blurb?: string;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  const requestedWeek = params.week ? Number(params.week) : undefined;

  let league;

  try {
    league = await fetchEspnLeague(requestedWeek);
  } catch (err: any) {
    return (
      <main className="power-page">
        <div className="error-card">
          <h1>ESPN connection failed</h1>

          <p>
            {err?.message || "Something went wrong while loading the league."}
          </p>

          <p>
            Double check ESPN_LEAGUE_ID, ESPN_SEASON, ESPN_SWID, and ESPN_S2 in
            your .env.local file.
          </p>
        </div>
      </main>
    );
  }

  const selectedWeek =
    requestedWeek && requestedWeek > 0 ? requestedWeek : league.currentWeek;

  /*
   * Load ESPN weekly blurbs / manual rankings and league blurb.
   */
  let weeklyData: WeeklyData[] = [];
  let leagueBlurb = "";

  const { data, error } = await supabase
    .from("espn_weekly_data")
    .select("team_id, week, blurb, manual_rank, league_blurb")
    .eq("week", selectedWeek);

  if (error) {
    console.error("Failed to load ESPN weekly data:", error);
  } else {
    weeklyData = data || [];
    const leagueRow = weeklyData.find((row: any) => row.team_id === 0);
    leagueBlurb = leagueRow?.league_blurb || "";
  }

  /*
   * Map weekly data by ESPN team ID.
   */
  const weeklyByTeam = new Map<number, WeeklyData>();

  weeklyData.forEach((row) => {
    weeklyByTeam.set(Number(row.team_id), row);
  });

  /*
   * Apply manual rankings if they exist.
   *
   * Teams without a manual rank retain their ESPN
   * ranking order.
   */
  const sortedTeams = [...league.teams].sort((a, b) => {
    const aData = weeklyByTeam.get(a.id);
    const bData = weeklyByTeam.get(b.id);

    const aRank = aData?.manual_rank;
    const bRank = bData?.manual_rank;

    if (aRank != null && bRank != null) {
      return aRank - bRank;
    }

    if (aRank != null) {
      return -1;
    }

    if (bRank != null) {
      return 1;
    }

    return a.ranking.powerRank - b.ranking.powerRank;
  });

  /*
   * Display rank should reflect the actual displayed
   * order when manual rankings are being used.
   */
  const displayTeams = sortedTeams.map((team, index) => ({
    ...team,
    displayRank: index + 1,
  }));

  return (
    <main className="power-page">
      <header className="power-header">
        <img
          src="/images/ff-logo.png"
          alt="ESPN Fantasy Football"
          className="league-logo"
        />

        <div className="league-title">
          <h1>{league.season} Power Rankings</h1>

          <h2>
            {league.leagueName} — Week {selectedWeek}
          </h2>
        </div>

        <nav className="week-nav">
          {Array.from({ length: league.weeks }, (_, index) => index + 1).map(
            (week) => {
              const isActive = week === selectedWeek;

              const isUnlocked = week <= league.currentWeek;

              if (!isUnlocked) {
                return (
                  <span key={week} className="week-link disabled">
                    {week}
                  </span>
                );
              }

              return (
                <a
                  key={week}
                  href={`/?week=${week}`}
                  className={`week-link ${isActive ? "active" : ""}`}
                >
                  {week}
                </a>
              );
            },
          )}
        </nav>

        <section className="team-avatars">
          {displayTeams.map((team) => (
            <a
              key={team.id}
              href={`#team-${team.id}`}
              className="avatar-button"
              title={`${team.name} — ${team.ownerName}`}
            >
              {team.logo ? (
                <img src={proxyImageUrl(team.logo)} alt={`${team.name} logo`} />
              ) : (
                <div className="avatar-placeholder">
                  {team.abbrev || team.name.charAt(0)}
                </div>
              )}
            </a>
          ))}
        </section>

        {leagueBlurb && (
          <section className="weekly-update">
            <p>{leagueBlurb}</p>
          </section>
        )}
      </header>

      {selectedWeek > 1 && (
        <section className="high-score-section">
          <div className="high-score-grid">
            {(() => {
              const highestGameTeam = displayTeams.reduce((prev, current) =>
                current.highestWeekScore > prev.highestWeekScore
                  ? current
                  : prev,
              );

              const highestTotalTeam = displayTeams.reduce((prev, current) =>
                current.pointsFor > prev.pointsFor ? current : prev,
              );

              return (
                <>
                  <div className="high-score-card">
                    <div className="high-score-title">
                      Most Points Scored in a Game (Regular Season)
                    </div>

                    <div className="high-score-content">
                      {highestGameTeam.logo ? (
                        <img
                          src={proxyImageUrl(highestGameTeam.logo)}
                          alt={`${highestGameTeam.name} logo`}
                          className="high-score-logo"
                        />
                      ) : (
                        <div className="high-score-logo-placeholder">
                          {highestGameTeam.abbrev ||
                            highestGameTeam.name.charAt(0)}
                        </div>
                      )}

                      <div className="high-score-info">
                        <h3>{highestGameTeam.name}</h3>
                        <p className="high-score-value">
                          {highestGameTeam.highestWeekScore.toFixed(2)} points
                          (Week {highestGameTeam.highestWeekNumber})
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="high-score-card total">
                    <div className="high-score-title">
                      Most Points Total (Regular Season)
                    </div>

                    <div className="high-score-content">
                      {highestTotalTeam.logo ? (
                        <img
                          src={proxyImageUrl(highestTotalTeam.logo)}
                          alt={`${highestTotalTeam.name} logo`}
                          className="high-score-logo"
                        />
                      ) : (
                        <div className="high-score-logo-placeholder">
                          {highestTotalTeam.abbrev ||
                            highestTotalTeam.name.charAt(0)}
                        </div>
                      )}

                      <div className="high-score-info">
                        <h3>{highestTotalTeam.name}</h3>
                        <p className="high-score-value">
                          {highestTotalTeam.pointsFor.toFixed(2)} points
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      )}

      <section className="standings">
        {displayTeams.map((team) => {
          const weekly = weeklyByTeam.get(team.id);

          return (
            <TeamCard key={team.id} team={team} blurb={weekly?.blurb || ""} />
          );
        })}
      </section>

      <footer className="power-footer">
        <p>ESPN Fantasy Football · {league.season}</p>
      </footer>
    </main>
  );
}
