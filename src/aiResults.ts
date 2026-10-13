export function parseScoreResults(text: string, expectedIds: string[]): Array<Record<string, unknown>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
  } catch {
    throw new Error("AI returned incomplete scoring data. Please retry.");
  }
  const results = Array.isArray(parsed) ? parsed : (parsed as { results?: unknown } | null)?.results;
  if (!Array.isArray(results) || results.some(item => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error("AI returned an invalid scoring response. Please retry.");
  }
  for (const id of expectedIds) {
    if (results.filter(item => item.id === id).length !== 1) {
      throw new Error("AI did not return exactly one score for each requested lead. Please retry.");
    }
  }
  return results.filter(item => expectedIds.includes(item.id));
}
