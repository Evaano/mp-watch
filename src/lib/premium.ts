/**
 * What the health insurance figures actually measure.
 *
 * This is the single most misreadable property of the dataset, so it lives in
 * one file that everything else refers to.
 *
 * The premium is priced PER HEAD and the policy covers the member AND their
 * dependents. A member's figure therefore tracks how many people the state is
 * insuring, not how much that member personally received. Two members on the
 * same terms differ only by household size.
 *
 * The rate by fiscal year lives in scripts/ingest/validate.py, which enforces
 * that every premium divides exactly by the rate in force. It was duplicated
 * here as a table nothing read.
 */

export const CURRENT_PER_HEAD_RATE = 24000;
