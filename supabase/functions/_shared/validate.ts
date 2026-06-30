export const MAX_BODY_BYTES = 128 * 1024;
export const MAX_TEXT = 4000;
export const MAX_TITLE = 300;
export const MAX_LIST_ITEMS = 50;
export const MAX_LIST_ITEM_TEXT = 80;

export class PayloadTooLargeError extends Error {
  status = 413;

  constructor() {
    super("Payload too large");
    this.name = "PayloadTooLargeError";
  }
}

export function isPayloadTooLargeError(error: unknown): error is PayloadTooLargeError {
  return error instanceof PayloadTooLargeError;
}

export function clampText(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function clampStringArray(value: unknown, maxItems = MAX_LIST_ITEMS, maxText = MAX_LIST_ITEM_TEXT): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => clampText(item, maxText).trim())
    .filter(Boolean);
}

export async function readJsonLimited(req: Request, maxBytes = MAX_BODY_BYTES): Promise<any> {
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > maxBytes) {
    throw new PayloadTooLargeError();
  }
  return JSON.parse(raw);
}
