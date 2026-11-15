type DatedRecord = { id: string; createdAt: string; updatedAt?: string };

function recordTime(record: DatedRecord): number {
  const time = Date.parse(record.updatedAt ?? record.createdAt);
  return Number.isNaN(time) ? 0 : time;
}

export function mergeByTimestamp<T extends DatedRecord>(local: T[], remote: T[]): T[] {
  const byId = new Map(local.map((record) => [record.id, record]));
  for (const candidate of remote) {
    const current = byId.get(candidate.id);
    if (!current || recordTime(candidate) >= recordTime(current)) byId.set(candidate.id, candidate);
  }
  return [...byId.values()];
}

export function recordsToUpload<T extends DatedRecord>(local: T[], remote: T[]): T[] {
  const remoteById = new Map(remote.map((record) => [record.id, record]));
  return local.filter((record) => {
    const remoteRecord = remoteById.get(record.id);
    return !remoteRecord || recordTime(record) > recordTime(remoteRecord);
  });
}
