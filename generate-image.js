require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer');
const mustache = require('mustache');

const owner = 'processing'; // Replace with your GitHub username
const repo = 'processing4'; // Replace with your repository name

const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
};

async function fetchRepoData() {
    try {
        const response = await fetch(apiUrl, { headers });
        if (!response.ok) {
            throw new Error(`GitHub API responded with status ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching repository data:', error);
    }
}

async function fetchContributorsCount() {
    try {
        const response = await fetch(`${apiUrl}/contributors?per_page=1&anon=true`, { headers });
        if (!response.ok) {
            throw new Error(`GitHub API responded with status ${response.status}`);
        }

        const linkHeader = response.headers.get('Link');
        let contributorsCount = 1;

        if (linkHeader) {
            const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
            if (match) {
                contributorsCount = parseInt(match[1], 10);
            }
        }

        return contributorsCount;
    } catch (error) {
        console.error('Error fetching contributors count:', error);
    }
}

function getImageDataUrl() {
    const imagePath = path.join(__dirname, 'templates', 'background.png');
    const imageBuffer = fs.readFileSync(imagePath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

function renderTemplate(data, baseURL) {
    const templatePath = path.join(__dirname, 'templates', 'template.html');
    const template = fs.readFileSync(templatePath, 'utf8');
    data.background_image = getImageDataUrl();
    const html = mustache.render(template, data);
    return html;
}

async function generateImage(html, baseURL) {
    const browser = await puppeteer.launch({
        defaultViewport: {
            width: 1200,
            height: 630,
            deviceScaleFactor: 1,
        },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--allow-file-access-from-files',
            '--enable-local-file-accesses',
        ],
        headless: true
    });

    const page = await browser.newPage();
    
    // Enable better debugging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', err => console.error('Browser page error:', err));

    await page.setContent(html, { 
        waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
        timeout: 30000,
        baseURL: baseURL 
    });

    // Add explicit wait for background image
    await page.evaluate(async () => {
        return new Promise((resolve) => {
            const backgroundUrl = getComputedStyle(document.body).backgroundImage;
            if (backgroundUrl === 'none') {
                resolve();
                return;
            }
            
            const img = new Image();
            img.src = backgroundUrl.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
            if (img.complete) {
                resolve();
            } else {
                img.onload = () => resolve();
                img.onerror = () => {
                    console.error('Failed to load background image:', img.src);
                    resolve();
                };
            }
        });
    });

    // Replace waitForTimeout with delay using setTimeout
    await new Promise(resolve => setTimeout(resolve, 1000));

    const buffer = await page.screenshot({ type: 'png' });
    await browser.close();
    return buffer;
}

async function main() {
    const repoData = await fetchRepoData();
    const contributorsCount = await fetchContributorsCount();

    if (repoData && contributorsCount !== undefined) {
        const data = {
            full_name: repoData.full_name,
            description: repoData.description || '',
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            contributors: contributorsCount,
        };

        const baseURL = path.resolve(path.join(__dirname, 'templates')).replace(/\\/g, '/');
        const html = renderTemplate(data, baseURL);
        const imageBuffer = await generateImage(html, baseURL);

        // Save the image to a file
        const outputPath = path.join(__dirname, 'og-image.png');
        fs.writeFileSync(outputPath, imageBuffer);

        console.log('OG image generated successfully!');
    } else {
        console.error('Failed to fetch all data.');
    }
}

main();
