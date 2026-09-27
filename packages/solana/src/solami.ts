const SOLAMI_RPC_URL = "https://rpc.solami.dev/sol";
const SOLAMI_WS_URL = "wss://rpc.solami.dev/ws/sol";

function authenticatedEndpoint(endpoint: string, apiKey: string): string {
  const url = new URL(endpoint);
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

export function solamiRpcEndpoint(
  apiKey: string,
  endpoint = SOLAMI_RPC_URL,
): string {
  return authenticatedEndpoint(endpoint, apiKey);
}

export function solamiWebSocketEndpoint(
  apiKey: string,
  endpoint = SOLAMI_WS_URL,
): string {
  return authenticatedEndpoint(endpoint, apiKey);
}
