export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  return Response.json({
    milestone: 1,
    service: "usekratose-control-api",
    status: "ok",
  });
}
