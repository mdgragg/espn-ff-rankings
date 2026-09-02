import { fetchEspnLeague } from "@/lib/espn";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const league = await fetchEspnLeague();

    return Response.json({
      teams: league.teams.map((team) => ({
        id: team.id,
        name: team.name,
        abbrev: team.abbrev,
        logo: team.logo,
        ownerName: team.ownerName,
      })),
    });
  } catch (error: any) {
    console.error("Failed to load ESPN teams:", error);

    return Response.json(
      {
        error: error?.message || "Failed to load ESPN teams",
      },
      {
        status: 500,
      },
    );
  }
}
