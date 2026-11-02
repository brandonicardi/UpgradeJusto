import { expect, type Locator } from "@playwright/test";
import { actionLabel } from "../../lib/central-presentation";
import { towerCategories } from "../../lib/towers";
import type { TowerPlanRead } from "../../lib/tower-plans";

// Closed stages deliberately do not load metadata. Open the actual controls
// before asserting readiness; never toggle an already-open stage closed.
export async function openPlanStagesForEvidence(read: Locator, plan: TowerPlanRead, phase: (value: string) => void) {
  for (const stage of plan.snapshot.stages) {
    phase(`stage-${stage.position}-open-control`);
    const summary = read.locator("summary").filter({ hasText: new RegExp(`^Etapa ${stage.position}:`) });
    await expect(summary).toHaveCount(1, { timeout: 5000 }); await expect(summary).toBeVisible({ timeout: 5000 });
    const panel = summary.locator("..");
    if (await panel.getAttribute("open") === null) await summary.click({ timeout: 5000 });
    phase(`stage-${stage.position}-confirm-open`);
    await expect(panel).toHaveJSProperty("open", true, { timeout: 5000 });
  }
  for (const stage of plan.snapshot.stages) {
    phase(`stage-${stage.position}-metadata-count`);
    const panel = read.locator("summary").filter({ hasText: new RegExp(`^Etapa ${stage.position}:`) }).locator("..");
    const parts = panel.locator(".central-proposal-part");
    const expected = stage.actions.reduce((count, action) => count + action.candidates.filter(candidate => candidate.component_id !== null).length, 0);
    await expect(parts).toHaveCount(expected, { timeout: 5000 });
    for (let index = 0; index < expected; index++) {
      phase(`stage-${stage.position}-part-${index + 1}-metadata-resolved`);
      const part = parts.nth(index);
      await expect(part).toBeVisible({ timeout: 5000 });
      await expect(part).not.toContainText("Consultando referencia y versión del catálogo", { timeout: 5000 });
      // Resolved component renderer, not merely a different error placeholder.
      // Its image may still honestly be unavailable; photo settling is separate.
      await expect(part.locator(".tower-product-photo")).toHaveCount(1, { timeout: 5000 });
    }
  }
}

export async function closePlanStagesForEvidence(read: Locator, plan: TowerPlanRead) {
  for (const stage of plan.snapshot.stages) {
    const summary = read.locator("summary").filter({ hasText: new RegExp(`^Etapa ${stage.position}:`) });
    const panel = summary.locator("..");
    if (await panel.getAttribute("open") !== null) await summary.click({ timeout: 5000 });
    await expect(panel).toHaveJSProperty("open", false, { timeout: 5000 });
  }
}

// Opens the actual disclosure controls. No injected DOM, new writes or recalc.
export async function planAnchorEvidence(read: Locator, plan: TowerPlanRead, shot: (file: string, anchor: Locator) => Promise<void>) {
  await shot("plan-before-after-cards.png", read.getByRole("region", { name: "Comparación del plan", exact: true }));
  for (const stage of plan.snapshot.stages) {
    const summary = read.locator("summary").filter({ hasText: new RegExp(`^Etapa ${stage.position}:`) });
    const panel = summary.locator("..");
    if (await panel.getAttribute("open") === null) await summary.click();
    const technical = panel.locator("details.stage-technical-evaluation");
    if (await technical.getAttribute("open") === null) await technical.locator(":scope > summary").click();
    const comparison = panel.getByText("Base y resultado real de esta etapa", { exact: true });
    if (await comparison.locator("..").getAttribute("open") === null) await comparison.click();
    for (const [index, title] of ["Antes de esta etapa", "Resultado evaluado"].entries()) {
      await shot(`stage-${stage.position}-comparison-${index === 0 ? "before" : "after"}.png`, panel.getByRole("heading", { level: 4, name: title, exact: true }));
    }
    // Return to the actual compact reading state before purchase captures.
    await comparison.click();
    await technical.locator(":scope > summary").click();
    await expect(technical).not.toHaveAttribute("open", "");
    for (const [index, action] of stage.actions.entries()) {
      const name = `${towerCategories[action.category]} · ${actionLabel(action.action)}`;
      const occurrence = stage.actions.slice(0, index).filter(previous => previous.category === action.category && previous.action === action.action).length;
      const heading = panel.getByRole("heading", { level: 4, name, exact: true }).nth(occurrence), section = heading.locator("..");
      await expect(section).not.toContainText("Consultando referencia y versión del catálogo");
      for (const candidate of action.candidates) await expect(section).toContainText(`Cantidad explícita: ${candidate.quantity}`);
      await heading.scrollIntoViewIfNeeded();
      const photos = section.locator(".tower-product-photo");
      await expect.poll(() => photos.evaluateAll(elements => elements.every(element => element.getAttribute("data-photo-state") !== "loading")), { timeout: 5000 }).toBe(true);
      await shot(`stage-${stage.position}-action-${index + 1}-quantity.png`, heading);
    }
    if (await panel.getAttribute("open") !== null) await summary.click();
    await expect(panel).toHaveJSProperty("open", false, { timeout: 5000 });
  }
}
