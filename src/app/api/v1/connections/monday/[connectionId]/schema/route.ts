import { NextResponse } from "next/server";
import { boardConfigSchema } from "@/config/boards";
import { MondaySourceAdapter } from "@/adapters/monday/adapter";
import { requireContext } from "@/platform/auth/context";
import {
  getTenantConnection,
  resolveConnectionToken,
  updateConnectionConfig,
} from "@/platform/connections/repository";
import { assertSameOrigin } from "@/platform/security/origin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ connectionId: string }> };

export async function GET(request: Request, route: RouteContext) {
  const context = await requireContext({ request, roles: ["admin"] });
  const { connectionId } = await route.params;
  const connection = await getTenantConnection(context.tenantId, connectionId);
  const adapter = new MondaySourceAdapter(resolveConnectionToken);
  return NextResponse.json({
    connectionId,
    entities: await adapter.discover(connection),
    mappingVersion: connection.mappingVersion,
  });
}

export async function PUT(request: Request, route: RouteContext) {
  assertSameOrigin(request);
  const context = await requireContext({ request, roles: ["admin"] });
  const { connectionId } = await route.params;
  await getTenantConnection(context.tenantId, connectionId);
  const config = boardConfigSchema.parse(await request.json());
  const updated = await updateConnectionConfig(
    context.tenantId,
    connectionId,
    config,
  );
  return NextResponse.json({
    connectionId,
    mappingVersion: updated.mappingVersion,
    status: "configured",
  });
}
