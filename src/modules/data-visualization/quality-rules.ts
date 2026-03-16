export type ScorePenaltyRule = {
  pointsPerOccurrence: number;
  maxPenalty: number;
  warnUpperBound: number;
};

export type FreshnessRule = {
  passLimitSeconds: number;
  warnLimitSeconds: number;
  penaltyStepSeconds: number;
  penaltyStepPoints: number;
  basePenaltyPoints: number;
  maxPenalty: number;
};

export type QualityScoringRules = {
  intervalSeconds: number;
  timelineSlotCount: number;
  rollingWindowSize: number;
  freshness: FreshnessRule;
  penalties: {
    missingIntervals: ScorePenaltyRule;
    duplicateTimestamps: ScorePenaltyRule;
    invalidOhlcRows: ScorePenaltyRule;
  };
};

export const defaultQualityScoringRules: QualityScoringRules = {
  intervalSeconds: 60,
  timelineSlotCount: 60,
  rollingWindowSize: 20,
  freshness: {
    passLimitSeconds: 120,
    warnLimitSeconds: 300,
    penaltyStepSeconds: 30,
    penaltyStepPoints: 3,
    basePenaltyPoints: 3,
    maxPenalty: 20,
  },
  penalties: {
    missingIntervals: {
      pointsPerOccurrence: 8,
      maxPenalty: 30,
      warnUpperBound: 2,
    },
    duplicateTimestamps: {
      pointsPerOccurrence: 10,
      maxPenalty: 30,
      warnUpperBound: 2,
    },
    invalidOhlcRows: {
      pointsPerOccurrence: 6,
      maxPenalty: 30,
      warnUpperBound: 2,
    },
  },
};

export type QualityRulePresetId = "default";

export const qualityRulePresets: Record<
  QualityRulePresetId,
  QualityScoringRules
> = {
  default: defaultQualityScoringRules,
};

export function getQualityScoringRules(
  presetId?: QualityRulePresetId,
): QualityScoringRules {
  if (!presetId) {
    return defaultQualityScoringRules;
  }

  return qualityRulePresets[presetId] ?? defaultQualityScoringRules;
}
