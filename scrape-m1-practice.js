const { scrapePractice } = require("./scripts/scrape");

scrapePractice({
  testNamePrefix: "m1-practice-test-",
  allOutputFilename: "all-questions.json",
  totalTests: 5,
  selectors: {
    tab: "label#moto",
    firstTestLink: "#motoNextBtn a",
  },
}).catch((err) => {
  console.error("\nScript failed:", err);
  process.exit(1);
});
