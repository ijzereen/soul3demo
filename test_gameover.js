const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/');
  await page.waitForTimeout(1000);
  // trigger death by executing the function in the page context
  await page.evaluate(() => {
    // wait, takeDamage is not global, it's inside module.
    // Instead we can just click to start, and overwrite state.health
    document.body.requestPointerLock = () => { 
        document.dispatchEvent(new Event('pointerlockchange')); 
    };
    document.dispatchEvent(new MouseEvent('click'));
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
      // simulate pointerlock success
      Object.defineProperty(document, 'pointerLockElement', { get: () => document.body });
      document.dispatchEvent(new Event('pointerlockchange'));
  });
  // now we are just waiting for the boss to kill the player
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'test_die.png' });
  await browser.close();
})();
