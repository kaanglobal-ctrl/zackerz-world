// Tiny in-memory session-token store with no dependencies — avoids circular imports.
// The preview iframe blocks localStorage/sessionStorage, so we keep the token in
// module memory for the active session only.
let memoryToken: string | null = null;

export function getToken(): string | null {
  return memoryToken;
}

export function setToken(token: string | null) {
  memoryToken = token;
}
