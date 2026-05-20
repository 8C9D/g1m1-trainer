const { scrapePractice } = require("./scripts/scrape");

scrapePractice({
  testNamePrefix: "g1-practice-test-",
  allOutputFilename: "g1-all-questions.json",
  totalTests: 3,
  selectors: {
    firstTestLink: "#carNextBtn a",
    diagnosticCancel: "button#btnCancel",
  },
}).catch((err) => {
  console.error("\nScript failed:", err);
  process.exit(1);
});
