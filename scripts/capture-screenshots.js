import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkDevServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5174', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function captureScreenshots() {
  console.log('Starting screenshot capture...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();
  
  try {
    console.log('Navigating to application...');
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Capture light mode screenshot
    console.log('Capturing light mode screenshot...');
    await page.screenshot({
      path: join(process.cwd(), 'ui_light.png'),
      fullPage: false
    });
    
    // Click theme toggle to switch to dark mode
    console.log('Switching to dark mode...');
    const themeToggle = await page.locator('button[aria-label*="dark mode"]').first();
    if (await themeToggle.isVisible().catch(() => false)) {
      await themeToggle.click();
      await page.waitForTimeout(1000);
    }
    
    // Capture dark mode screenshot
    console.log('Capturing dark mode screenshot...');
    await page.screenshot({
      path: join(process.cwd(), 'ui_dark.png'),
      fullPage: false
    });
    
    console.log('Screenshots captured successfully!');
    console.log('- ui_light.png (Light mode)');
    console.log('- ui_dark.png (Dark mode)');
    
  } catch (error) {
    console.error('Error capturing screenshots:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

async function main() {
  const isRunning = await checkDevServer();
  
  if (!isRunning) {
    console.error('Error: Development server is not running on port 5174');
    console.error('Please start the dev server first with: npm run dev');
    process.exit(1);
  }
  
  await captureScreenshots();
}

main().catch(console.error);
