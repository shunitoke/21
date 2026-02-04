import { test, expect } from '@playwright/test';

test('JournalModal recording workflow', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://127.0.0.1:55745');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Take screenshot
  await page.screenshot({ path: 'test-1-initial.png' });
  
  // Try to find and click the add entry button
  const addButton = page.getByRole('button').filter({ hasText: /добавить|новая|запись/i }).first();
  if (await addButton.isVisible().catch(() => false)) {
    await addButton.click();
  }
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-2-modal-open.png' });
  
  // Find the record button
  const recordButton = page.getByRole('button').filter({ hasText: /записать|голос/i }).first();
  console.log('Record button text:', await recordButton.textContent());
  await recordButton.click();
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-3-recording-started.png' });
  
  // Check if button now shows "Stop"
  const stopButton = page.getByRole('button').filter({ hasText: /остановить/i }).first();
  console.log('Button after record:', await stopButton.textContent());
  
  // Wait a bit and stop
  await page.waitForTimeout(2000);
  await stopButton.click();
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-4-recording-stopped.png' });
  
  // Check if audio player appeared
  const audioPlayer = page.locator('audio').first();
  if (await audioPlayer.isVisible().catch(() => false)) {
    console.log('Audio player is visible');
  }
  
  // Check if button now shows "Delete recording"
  const deleteButton = page.getByRole('button').filter({ hasText: /удалить/i }).first();
  const buttonText = await deleteButton.textContent();
  console.log('Button after stop:', buttonText);
  
  // Click to delete
  if (buttonText?.includes('Удалить')) {
    await deleteButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-5-after-delete.png' });
    
    // Check if button now shows "Record audio"
    const reRecordButton = page.getByRole('button').filter({ hasText: /записать/i }).first();
    console.log('Button after delete:', await reRecordButton.textContent());
  }
});
