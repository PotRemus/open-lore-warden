export enum CampaignStatus {
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
  Archived = 'archived',
}

export enum SceneStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export enum TurnOutcome {
  Success = 'success',
  Failure = 'failure',
  PartialSuccess = 'partial_success',
  CriticalSuccess = 'critical_success',
  CriticalFailure = 'critical_failure',
}

export enum CharacterType {
  PC = 'pc',
  NPC = 'npc',
}

export enum MemoryFactImportance {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}
