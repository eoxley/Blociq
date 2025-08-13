export async function extractBuildingId(
  req: Request,
  params?: { buildingId?: string }
): Promise<string|null> {
  const url = new URL(req.url);
  const qp =
    url.searchParams.get('building_id') ??
    url.searchParams.get('buildingId');

  const fromParams = params?.buildingId;
  const ct = req.headers.get('content-type') ?? '';

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    const fromForm =
      (form.get('building_id') ?? form.get('buildingId'))?.toString() ?? null;
    return fromForm ?? fromParams ?? qp;
  }

  try {
    const body: any = await req.json();
    const fromJson = body?.building_id ?? body?.buildingId ?? null;
    return fromJson ?? fromParams ?? qp;
  } catch {
    return fromParams ?? qp ?? null;
  }
}
