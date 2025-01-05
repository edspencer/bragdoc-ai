const puppeteer = require('puppeteer');
const path = require('node:path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set viewport to match our screenshot size
  await page.setViewport({ width: 840, height: 540 });

  // Load the HTML file
  await page.goto(
    `file://${path.join(__dirname, 'generate-screenshots.html')}`,
  );

  // Wait for everything to render
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Get all screenshots
  const screenshots = await page.$$('.screenshot');

  // Capture each screenshot
  for (let i = 0; i < screenshots.length; i++) {
    const element = screenshots[i];
    await element.screenshot({
      path: path.join(
        __dirname,
        '..',
        'public',
        'images',
        'screenshots',
        `feature-${i + 1}.png`,
      ),
    });
  }

  await browser.close();
})();
