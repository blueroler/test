const puppeteer = require("puppeteer");
const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const mkdir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const saveFile = async (url, outputPath) => {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(outputPath, response.data);
  } catch (err) {
    console.warn(`Không tải được: ${url} -> ${err.message}`);
  }
};

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("https://ex.com", { waitUntil: "networkidle0" });

  const html = await page.content();
  const $ = cheerio.load(html);

  const baseURL = "https://ex.com";
  mkdir("assets/img");
  mkdir("assets/css");
  mkdir("assets/js");

  const downloadTasks = [];

  // Handle <img>
  $("img").each((i, el) => {
    let src = $(el).attr("src");
    if (!src || src.startsWith("data:")) return;

    const absUrl = src.startsWith("http") ? src : baseURL + src;
    const filename = `img${i}${path.extname(src.split("?")[0]) || ".jpg"}`;
    const localPath = `assets/img/${filename}`;
    downloadTasks.push(saveFile(absUrl, localPath));
    $(el).attr("src", localPath);
  });

  // Handle <link rel="stylesheet">
  $('link[rel="stylesheet"]').each((i, el) => {
    let href = $(el).attr("href");
    if (!href) return;

    const absUrl = href.startsWith("http") ? href : baseURL + href;
    const filename = `style${i}${path.extname(href.split("?")[0]) || ".css"}`;
    const localPath = `assets/css/${filename}`;
    downloadTasks.push(saveFile(absUrl, localPath));
    $(el).attr("href", localPath);
  });

  // Handle <script src="">
  $("script[src]").each((i, el) => {
    let src = $(el).attr("src");
    if (!src) return;

    const absUrl = src.startsWith("http") ? src : baseURL + src;
    const filename = `script${i}${path.extname(src.split("?")[0]) || ".js"}`;
    const localPath = `assets/js/${filename}`;
    downloadTasks.push(saveFile(absUrl, localPath));
    $(el).attr("src", localPath);
  });

  await Promise.all(downloadTasks);

  // Lưu file HTML
  fs.writeFileSync("index.html", $.html());

  await browser.close();
})();
