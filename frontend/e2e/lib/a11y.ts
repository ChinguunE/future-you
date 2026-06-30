import AxeBuilder from '@axe-core/playwright';
import type {Page} from '@playwright/test';

export type AxeViolation = {
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: number;
};

/**
 * Run an axe-core WCAG 2.1 A/AA scan on the current page and return a flat,
 * loggable list of violations. The screenshot→refine loop fails a slice on any
 * `serious`/`critical` violation (see countSerious).
 */
export async function axeScan(page: Page): Promise<AxeViolation[]> {
  const results = await new AxeBuilder({page})
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length
  }));
}

export function countSerious(violations: AxeViolation[]): number {
  return violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  ).length;
}

export function logViolations(label: string, violations: AxeViolation[]): void {
  console.log(`[axe] ${label}: ${violations.length} violation(s)`);
  for (const v of violations) {
    console.log(`  - ${v.id} (${v.impact ?? 'n/a'}): ${v.nodes} node(s) — ${v.help}`);
  }
}
