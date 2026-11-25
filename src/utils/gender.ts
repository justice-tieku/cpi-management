export interface GenderSummary {
  total: number;
  male: number;
  female: number;
  unspecified: number;
  maleShare: string;
  femaleShare: string;
  maleToFemale: string;
}

export function getGenderSummary(records: readonly { gender?: 'Male' | 'Female' | null }[]): GenderSummary {
  const male = records.filter((record) => record.gender === 'Male').length;
  const female = records.filter((record) => record.gender === 'Female').length;
  const known = male + female;
  const divisor = (a: number, b: number): number => b === 0 ? a : divisor(b, a % b);
  const commonDivisor = divisor(male, female);

  return {
    total: records.length,
    male,
    female,
    unspecified: records.length - known,
    maleShare: known ? `${((male / known) * 100).toFixed(1)}%` : 'N/A',
    femaleShare: known ? `${((female / known) * 100).toFixed(1)}%` : 'N/A',
    maleToFemale: known ? `${male / commonDivisor}:${female / commonDivisor}` : 'N/A'
  };
}
