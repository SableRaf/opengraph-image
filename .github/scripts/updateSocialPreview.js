require('dotenv').config();
const puppeteer = require('puppeteer');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv)).options({
    o: { type: 'string', alias: 'owner', describe: 'Repository owner' },
    r: { type: 'string', alias: 'repo', describe: 'Repository name' },
}).argv;

const owner = argv.owner;
const repo = argv.repo;

async function updateSocialPreview() {
    console.log('Starting social preview update process...');
    if (!owner || !repo) {
        console.error('Repository owner and name must be provided.');
        process.exit(1);
    }

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    });

    const page = await browser.newPage();
    await page.goto(`https://github.com/login`);

    // Log in to GitHub
    await page.type('#login_field', String(process.env.BOT_GITHUB_USERNAME));
    await page.type('#password', String(process.env.BOT_GITHUB_PASSWORD));
    await page.click('[name="commit"]');
    await page.waitForNavigation();

    // Navigate to the social preview section
    await page.goto(`https://github.com/${owner}/${repo}/settings`);
    await page.waitForSelector('#repository_social_preview');

    // Click the "Edit" button
    await page.click('#edit-social-preview-button');
    await page.waitForSelector('label[for="repo-image-file-input"]');

    // Upload the new social preview image
    const input = await page.$('input[name="repository[social_preview]"]');
    await input.uploadFile('.github/og-image.png');
    await page.click('button[name="button"]');

    console.log('Social preview image updated successfully.');

    await browser.close();
}

updateSocialPreview();