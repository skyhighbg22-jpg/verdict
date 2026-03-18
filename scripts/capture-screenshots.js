import { chromium } from 'playwright';
import { join } from 'path';

async function captureScreenshots() {
  const port = 5180;
  console.log(`Using dev server on port ${port}`);
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();
  
  // Capture console logs for debugging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Page error:', error.message));
  
  try {
    console.log('Navigating to application...');
    await page.goto(`http://localhost:${port}`, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    console.log('Waiting for React to render (15 seconds)...');
    await page.waitForTimeout(15000);
    
    // Check root content
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.substring(0, 500) : 'no root';
    });
    console.log('Root content:', rootContent.substring(0, 200));
    
    // Capture light mode
    console.log('Capturing light mode screenshot...');
    await page.screenshot({
      path: join(process.cwd(), 'ui_light.png'),
      fullPage: false
    });
    console.log('✓ ui_light.png captured');
    
    // Try to toggle dark mode
    try {
      const themeToggle = page.locator('button[aria-label*="dark"]').first();
      await themeToggle.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      console.log('✓ Dark mode toggled');
    } catch (e) {
      console.log('Could not toggle theme:', e.message);
    }
    
    // Capture dark mode
    console.log('Capturing dark mode screenshot...');
    await page.screenshot({
      path: join(process.cwd(), 'ui_dark.png'),
      fullPage: false
    });
    console.log('✓ ui_dark.png captured');
    
    console.log('\n✅ Screenshots captured!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: join(process.cwd(), 'error-screenshot.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
