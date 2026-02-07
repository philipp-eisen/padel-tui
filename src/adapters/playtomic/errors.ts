export class PlaytomicApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = "PlaytomicApiError";
  }
}
