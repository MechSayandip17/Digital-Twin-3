import { TwinEnvironment } from '../types/auth';

/**
 * Strictly guards persistence writes to the Production Physical Asset store.
 * SIMULATION and HISTORICAL sandbox modes must NEVER write to or overwrite
 * Production tenant state, Production timer, or Production cloud telemetry.
 */
export function canPersistToProductionStore(
  activeEnvironment: TwinEnvironment | string | undefined,
  stateTargetEnvironment?: string
): boolean {
  if (activeEnvironment !== 'PRODUCTION') {
    return false;
  }
  if (stateTargetEnvironment && stateTargetEnvironment !== 'PRODUCTION') {
    return false;
  }
  return true;
}

/**
 * Returns the isolated storage key for the specified environment & organisation.
 */
export function resolveEnvironmentStorageKey(
  environment: TwinEnvironment | string | undefined,
  orgId: string = 'iiests-mech'
): string {
  if (environment === 'PRODUCTION') {
    return `aerotwin_tenant_state_${orgId}`;
  }
  const safeEnv = (environment || 'SIMULATION').toLowerCase();
  return `aerotwin_sandbox_${safeEnv}`;
}

/**
 * Returns true if the given persisted state object is a valid Production snapshot
 * with stations & config intact and not polluted by a Simulation/Historical tag.
 */
export function isValidProductionSnapshot(candidate: any): boolean {
  if (!candidate || typeof candidate !== 'object') return false;
  if (!candidate.stations || !candidate.config) return false;
  if (candidate.targetEnvironment && candidate.targetEnvironment !== 'PRODUCTION') {
    return false;
  }
  return true;
}

/**
 * Picks the freshest Production snapshot between local cache and remote server state.
 * Never returns a Simulation/Historical snapshot, preventing mode-switching timer resets.
 */
export function pickNewestProductionState(localState: any | null, remoteState: any | null): any | null {
  const localValid = isValidProductionSnapshot(localState);
  const remoteValid = isValidProductionSnapshot(remoteState);

  if (!localValid && !remoteValid) return null;
  if (remoteValid && !localValid) return remoteState;
  if (localValid && !remoteValid) return localState;

  const getTimestamp = (s: any): number =>
    Number(s?._serverSavedTimestamp || s?._savedWallTime || s?.lastSavedTimestamp || 0);

  const remoteTs = getTimestamp(remoteState);
  const localTs = getTimestamp(localState);

  // If timestamps are close or equal, prefer remote server state as source of truth
  if (remoteTs >= localTs) {
    return remoteState;
  }
  return localState;
}
