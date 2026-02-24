#!/usr/bin/env node

const {Command} = require("commander");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const {version} = require("./package.json");

const program = new Command();

program
  .name("mmap")
  .description("Markmap HTML to PDF/PNG")
  .version(version)
  .requiredOption("-i, --input <path>", "Input Markmap HTML file")
  .requiredOption("-o, --output <path>", "Output file path (.pdf or .png)")
  .option("-s, --scale <number>", "PNG export scale factor (default: 2)", "2")
  .action(async (options) => {
    const inputPath = path.resolve(options.input);
    const outputPath = path.resolve(options.output);
    const isPdf = outputPath.endsWith(".pdf");
    const isPng = outputPath.endsWith(".png");

    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Cannot find input file "${options.input}"`);
      process.exit(1);
    }

    if (!isPdf && !isPng) {
      console.error("Error: Output file must end with .pdf or .png");
      process.exit(1);
    }

    // console.log(
    //   `Converting: ${path.basename(inputPath)} -> ${path.basename(
    //     outputPath
    //   )}`
    // );

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
    const page = await browser.newPage();

    try {
      // Load the Markmap HTML file
      await page.goto(`file://${inputPath}`, {waitUntil: "networkidle0"});

      const selector = "svg#mindmap";
      await page.waitForSelector(selector);

      // --- Core Pre-processing Logic ---
      const dimensions = await page.evaluate((sel) => {
        const svg = document.querySelector(sel);
        // Disable animations to prevent capturing transition states
        svg.style.transition = "none";

        // Calculate the actual BBox of the mind map content
        const box = svg.getBBox();
        const padding = 20; // Margin padding
        const width = box.width + padding * 2;
        const height = box.height + padding * 2;

        // Dynamically adjust viewBox to ensure content fits snugly and is fully contained
        svg.setAttribute(
          "viewBox",
          `${box.x - padding} ${box.y - padding} ${width} ${height}`
        );
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;

        // Clean up body styles for transparent export
        document.body.style.background = "transparent";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        return {width, height};
      }, selector);

      if (isPdf) {
        // --- Export PDF (Vector) ---
        // Dynamically set page size to match map dimensions, eliminating white borders
        await page.pdf({
          path: outputPath,
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          printBackground: true,
          pageRanges: "1",
          margin: {top: 0, right: 0, bottom: 0, left: 0},
        });
      } else {
        // --- Export PNG (Bitmap) ---
        await page.setViewport({
          width: Math.ceil(dimensions.width),
          height: Math.ceil(dimensions.height),
          deviceScaleFactor: parseFloat(options.scale),
        });
        const element = await page.$(selector);
        await element.screenshot({
          path: outputPath,
          omitBackground: true, // Supports transparent background
        });
      }

      // console.log(`Export successful!`);
    } catch (err) {
      console.error(`Runtime Error: ${err.message}`);
    } finally {
      await browser.close();
    }
  });

program.parse(process.argv);
