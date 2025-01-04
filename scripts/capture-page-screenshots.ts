const puppeteer = require('puppeteer');
const path = require('node:path');

// Get URL from command line arguments, default to localhost:3000
const url = process.argv[2] || 'http://localhost:3000';

// Extract page name from URL for filename
const getPageName = (url: string) => {
  const pathname = new URL(url).pathname;
  return pathname === '/'
    ? 'marketing'
    : pathname.split('/').filter(Boolean).join('-') || 'marketing';
};

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set a reasonable viewport size
  await page.setViewport({ width: 1280, height: 800 });

  // Function to capture full page screenshot
  async function captureFullPage(mode: string) {
    // Wait for theme to be fully applied
    await page.evaluate((theme: string) => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }, mode);

    // Wait for theme changes to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pageName = getPageName(url);
    await page.screenshot({
      path: path.join(__dirname, '..', 'temp', `${pageName}-${mode}.png`),
      fullPage: true,
    });
  }

  try {
    // Load the page
    console.log(`Loading ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Capture both light and dark modes
    await captureFullPage('light');
    await captureFullPage('dark');

    const pageName = getPageName(url);
    console.log(
      `Screenshots captured in temp/${pageName}-light.png and temp/${pageName}-dark.png`,
    );
  } catch (error) {
    console.error('Error capturing screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
