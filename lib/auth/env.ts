export function isMockAuthEnabled(): boolean {
  return (
    process.env.HESTIA_AUTH_MODE === "mock" &&
    Boolean(process.env.MOCK_AUTH_PASSWORD)
  );
}
