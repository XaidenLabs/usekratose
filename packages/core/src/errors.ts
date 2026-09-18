export type UseKratoseErrorCode =
  | "ACCOUNT_NOT_FOUND"
  | "INVALID_ADDRESS"
  | "INVALID_LOADER_STATE"
  | "NOT_EXECUTABLE"
  | "RPC_ERROR"
  | "UNSUPPORTED_LOADER";

export class UseKratoseError extends Error {
  public constructor(
    public readonly code: UseKratoseErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "UseKratoseError";
  }
}
