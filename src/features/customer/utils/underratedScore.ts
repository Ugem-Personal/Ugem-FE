import type { Merchant } from "../types";

type MerchantRecord = Record<string, unknown>;

type ScoreInput = {
  value: number;
  found: boolean;
};

export type UnderratedScoreDisplay = {
  score: number;
  percent: number;
};

function getNumberField(record: MerchantRecord, keys: string[]): ScoreInput {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return { value, found: true };
    }

    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return { value: parsed, found: true };
      }
    }
  }

  return { value: 0, found: false };
}

function normalizeScore(value: number) {
  const score = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, score));
}

function getPercent(score: number) {
  return Math.max(0, Math.min(100, Math.round(score * 1000) / 10));
}

export function getRawUnderratedScore(merchant?: Merchant | null) {
  if (!merchant) return null;

  const { value, found } = getNumberField(merchant as MerchantRecord, [
    "underratedScore",
    "UnderratedScore",
    "underrated_score",
    "us",
    "US",
  ]);

  return found ? normalizeScore(value) : null;
}

export function getDisplayUnderratedScore(
  merchant?: Merchant | null,
): UnderratedScoreDisplay | null {
  const rawScore = getRawUnderratedScore(merchant);

  if (rawScore === null) return null;

  return {
    score: rawScore,
    percent: getPercent(rawScore),
  };
}
