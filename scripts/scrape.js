const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const OUTPUT_DIR = path.join(__dirname, "..", "data");
const HOME_URL = "https://www.g1.ca/";

const COMMON_SELECTORS = {
  startTestButton: "#atBtnStart",
  onboardingDismiss: 'button[data-target="#test-menu-dropdown"]',
  questionBlock: "#atQuestion",
  screenshotTarget: "#atQuestionWrp",
  questionImage: "#atMediaCoverWrp img",
  answerOptions: "#atAnswers .item",
  answerText: ".inner",
  correctAnswerText: "#atAnswers .item.correct .inner",
  explanation: ".atExplanation",
  nextButton: "#atNextBtn",
  nextTestButton: "#btnNextTest",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clean(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function pad(n) {
  return String(n).padStart(3, "0");
}

async function textOrEmpty(locator, timeout = 2000) {
  try {
    return clean(await locator.innerText({ timeout }));
  } catch {
    return "";
  }
}

async function getQuestionText(page, selectors) {
  return page.locator(selectors.questionBlock).evaluate((el) => {
    const clone = el.cloneNode(true);
    clone.querySelector("#atSection")?.remove();
    clone.querySelector("#atAnswers")?.remove();
    clone.querySelectorAll("svg").forEach((s) => s.remove());
    clone.querySelector(".btnWrp")?.remove();
    return clone.textContent.replace(/\s+/g, " ").trim();
  });
}

async function getAnswerOptions(page, selectors) {
  return page.locator(selectors.answerOptions).evaluateAll((items) =>
    items
      .map((item) => ({
        index: item.getAttribute("data-i"),
        text: (item.querySelector(".inner")?.textContent || "").replace(/\s+/g, " ").trim(),
      }))
      .filter((o) => o.text)
  );
}

async function getQuestionImageUrl(page, selectors) {
  const urls = await page
    .locator(selectors.questionImage)
    .evaluateAll((imgs) =>
      imgs.map((img) => img.currentSrc || img.src || img.getAttribute("src")).filter(Boolean)
    )
    .catch(() => []);
  return urls[0] ? new URL(urls[0], page.url()).href : null;
}

async function dismissIfVisible(page, selector, probeTimeout) {
  if (!selector) return;
  const btn = page.locator(selector);
  if (await btn.isVisible({ timeout: probeTimeout }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function waitForQuestion(page, selectors) {
  await page.locator(selectors.questionBlock).waitFor({ state: "visible", timeout: 10000 });
  await page.locator(selectors.answerOptions).first().waitFor({ state: "visible", timeout: 10000 });
}

async function scrapeTest(page, testName, selectors) {
  const testDir = path.join(OUTPUT_DIR, testName);
  const screenshotDir = path.join(testDir, "screenshots");
  ensureDir(testDir);
  ensureDir(screenshotDir);

  const results = [];
  let n = 1;

  while (true) {
    await dismissIfVisible(page, selectors.onboardingDismiss, 500);
    await waitForQuestion(page, selectors);

    const questionId = `q${pad(n)}`;
    const question = await getQuestionText(page, selectors);
    const questionImageUrl = await getQuestionImageUrl(page, selectors);
    const answerOptions = await getAnswerOptions(page, selectors);

    if (!question || answerOptions.length === 0) {
      console.log(`[${testName}] ${questionId}: missing content, stopping.`);
      break;
    }

    await page.locator(selectors.screenshotTarget).screenshot({
      path: path.join(screenshotDir, `${questionId}-before.png`),
    });

    const firstOption = page.locator(selectors.answerOptions).first();
    const chosenAnswer = await textOrEmpty(firstOption.locator(selectors.answerText).first());
    await firstOption.click();
    await page.waitForTimeout(1000);

    await page.locator(selectors.screenshotTarget).screenshot({
      path: path.join(screenshotDir, `${questionId}-after.png`),
    });

    const correctAnswer = await textOrEmpty(page.locator(selectors.correctAnswerText).first());
    const explanation = await textOrEmpty(page.locator(selectors.explanation).first());

    results.push({
      testName,
      questionNumber: n,
      question,
      questionImageUrl,
      answerOptions,
      chosenAnswer,
      correctAnswer: correctAnswer || null,
      explanation: explanation || "",
    });

    console.log(`[${testName}] ${questionId}: ${question.slice(0, 80)}${question.length > 80 ? "..." : ""}`);

    await page.locator(selectors.nextButton).click();
    await page.waitForTimeout(1200);

    // Some classes (e.g., G1) show a "Diagnostic Warning" interstitial after the last question.
    await dismissIfVisible(page, selectors.diagnosticCancel, 2000);

    const stillOnQuestion = await page
      .locator(selectors.questionBlock)
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (!stillOnQuestion) break;

    n++;
  }

  fs.writeFileSync(
    path.join(testDir, "questions.json"),
    JSON.stringify(results, null, 2),
    "utf8"
  );
  console.log(`[${testName}] Saved ${results.length} questions.\n`);

  return results;
}

async function getNextTestQuestionCount(page, selectors) {
  const text = await textOrEmpty(page.locator(selectors.nextTestButton).first());
  const match = text.match(/(\d+)\s+new\s+question/i);
  return match ? Number(match[1]) : null;
}

/**
 * Scrape a series of practice tests from g1.ca.
 *
 * @param {object} config
 * @param {string} config.testNamePrefix       e.g. "g1-practice-test-" or "m1-practice-test-"
 * @param {string} config.allOutputFilename    combined-output filename in data/, e.g. "g1-all-questions.json"
 * @param {number} config.totalTests           number of practice tests to scrape in sequence
 * @param {object} [config.selectors]          selector overrides:
 *   @param {string} [config.selectors.tab]              clicked on the home page before navigation (M1 only)
 *   @param {string}  config.selectors.firstTestLink     the "Next: ..." link to the first test landing page
 *   @param {string} [config.selectors.diagnosticCancel] dismisses the post-last-question interstitial (G1 only)
 */
async function scrapePractice({ testNamePrefix, allOutputFilename, totalTests, selectors: overrides = {} }) {
  const selectors = { ...COMMON_SELECTORS, ...overrides };

  ensureDir(OUTPUT_DIR);

  const browser = await chromium.launch({ headless: false, slowMo: 75 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await page.goto(HOME_URL, { waitUntil: "domcontentloaded" });
  if (selectors.tab) {
    await page.locator(selectors.tab).click();
  }
  await page.waitForTimeout(800);

  await page.locator(selectors.firstTestLink).click();
  await page.waitForTimeout(1000);

  const allResults = [];

  for (let testIndex = 1; testIndex <= totalTests; testIndex++) {
    const testName = `${testNamePrefix}${testIndex}`;
    console.log(`\n--- Starting ${testName} ---`);

    await page.locator(selectors.startTestButton).click();
    await page.waitForTimeout(1000);

    const testResults = await scrapeTest(page, testName, selectors);
    allResults.push(...testResults);

    if (testIndex < totalTests) {
      const nextCount = await getNextTestQuestionCount(page, selectors);
      console.log(`Next test has ${nextCount} questions. Navigating...`);

      await page.locator(selectors.nextTestButton).click();
      await page.waitForTimeout(1000);
    }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, allOutputFilename),
    JSON.stringify(allResults, null, 2),
    "utf8"
  );

  console.log(`\nDone. ${allResults.length} total questions saved to ${OUTPUT_DIR}`);
  await browser.close();
}

module.exports = { scrapePractice };
