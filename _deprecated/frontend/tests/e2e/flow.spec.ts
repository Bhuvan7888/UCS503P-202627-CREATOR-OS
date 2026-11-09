import { test, expect } from '@playwright/test';

test.describe('Phase 1 Full Flow (Mocked UI)', () => {
  test('agency dashboard renders and shows pipeline', async ({ page }) => {
    // We navigate to the agency dashboard
    await page.goto('http://localhost:3000/agency');
    
    // Check if the Agency Dashboard header is visible
    await expect(page.locator('h1:has-text("Agency Dashboard")')).toBeVisible();

    // Check if the total pipeline KPI is rendered
    await expect(page.locator('text=Total Pipeline (INR)')).toBeVisible();
    await expect(page.locator('text=₹4,25,000')).toBeVisible();

    // Verify recent deals table renders
    await expect(page.locator('h2:has-text("Recent Deals")')).toBeVisible();
    await expect(page.locator('text=TechCorp India').first()).toBeVisible();
    
    // Verify deliverable tracker
    await expect(page.locator('h2:has-text("Deliverables Tracker")')).toBeVisible();
  });

  test('creator negotiation dashboard renders checklist and benchmarks', async ({ page }) => {
    // Navigate to creator dashboard
    await page.goto('http://localhost:3000/creator');
    
    // Check if the negotiation dashboard header is visible
    await expect(page.locator('h1:has-text("Negotiation: FitLife Supplements")')).toBeVisible();

    // Verify benchmark percentile is surfaced
    await expect(page.locator('text=Market P50 Benchmark')).toBeVisible();
    await expect(page.locator('text=₹1,45,000')).toBeVisible();
    await expect(page.locator('text=Fitness, Micro tier (n=42)')).toBeVisible();
  });

  test('agency clause review screen shows flags and handles escalations', async ({ page }) => {
    // Navigate to the clause review screen
    await page.goto('http://localhost:3000/contracts/123/clauses');

    // Verify Assistant Panel is rendered
    await expect(page.locator('h3:has-text("Ask about this contract")')).toBeVisible();
    await expect(page.locator('text=I noticed two red flags regarding perpetual usage')).toBeVisible();

    // Verify red and green flags are displayed
    await expect(page.locator('span:has-text("RED FLAG")')).toHaveCount(2);
    await expect(page.locator('span:has-text("GREEN FLAG")')).toHaveCount(1);

    // Verify the LLM explanation for the perpetual usage rights is rendered
    await expect(page.locator('text=The term \'perpetual\' means the brand can use your content')).toBeVisible();

    // Verify an open escalation can be resolved
    // Find the clause card by its text content instead of the dynamic status
    const escalatedCard = page.locator('div').filter({ hasText: 'perpetual, worldwide usage rights' }).first();
    await expect(escalatedCard.locator('span:has-text("Escalation: OPEN")')).toBeVisible();

    // Click Resolve
    await escalatedCard.locator('button:has-text("Resolve")').click();

    // Verify status changes to CLEARED
    await expect(escalatedCard.locator('span:has-text("Escalation: CLEARED")')).toBeVisible();
  });

  test('brand approves a deliverable via portal link', async ({ page }) => {
    // Navigate to the brand portal link
    await page.goto('http://localhost:3000/portal/test-token-123');
    
    // Verify summary is loaded
    await expect(page.locator('h1:has-text("Deal Summary: TechCorp India")')).toBeVisible();
    
    // Verify deliverable pending review
    await expect(page.locator('h3:has-text("Instagram Reel - 60s")')).toBeVisible();

    // Click Approve
    await page.locator('button:has-text("Approve")').click();

    // Verify status changes to Approved
    await expect(page.locator('span:has-text("Approved")')).toBeVisible();
  });
});
