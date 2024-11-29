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

    console.log(`Repository owner: ${owner}`);
    console.log(`Repository name: ${repo}`);

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    });

    console.log('Browser launched.');

    const page = await browser.newPage();
    console.log('New page opened.');

    await page.goto(`https://github.com/login`);
    console.log('Navigated to GitHub login page.');

    // Check that the secrets are defined
    let missingCredentials = false;

    if (!process.env.BOT_GITHUB_USERNAME) {
        console.error('BOT_GITHUB_USERNAME must be defined in the repository secrets.');
        missingCredentials = true;
    }

    if (!process.env.BOT_GITHUB_PASSWORD) {
        console.error('BOT_GITHUB_PASSWORD must be defined in the repository secrets.');
        missingCredentials = true;
    }

    if (missingCredentials) {
        console.error('Missing credentials. Exiting...');
        process.exit(1);
    }

    // Log in to GitHub
    await page.type('#login_field', String(process.env.BOT_GITHUB_USERNAME));
    await page.type('#password', String(process.env.BOT_GITHUB_PASSWORD));

    await page.click('[name="commit"]');
    console.log('Login form submitted.');

    await page.waitForNavigation();
    console.log('Logged in to GitHub.');

    // Navigate to the social preview section
    await page.goto(`https://github.com/${owner}/${repo}/settings`);

    // Verify that the navigation to the settings page was successful
    const currentUrl = await page.url();
    if (currentUrl !== `https://github.com/${owner}/${repo}/settings`) {
        console.error(`Failed to navigate to the settings page of ${owner}/${repo}. Current URL: ${currentUrl}`);
        await browser.close();
        process.exit(1);
    }

    console.log(`Navigated to https://github.com/${owner}/${repo}/settings`);

    // Scroll to the bottom of the page to ensure that the "Social preview" section is loaded
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });
    console.log('Scrolled to bottom of settings page.');

    // Look for a tag with an action property that ends in /settings/open-graph-image
    const form = await page.$('form[action$="/settings/open-graph-image"]');
    if (!form) {
        console.error(`Could not find the Social Preview form for ${owner}/${repo}.`);
    }

    await page.waitForSelector('#edit-social-preview-button');
    console.log('Social preview edit button found.');

    // Click the "Edit" button to start editing the social preview
    await page.click('#edit-social-preview-button');
    console.log('Clicked the edit button.');

    await page.waitForSelector('label[for="repo-image-file-input"]');
    console.log('Image file input found.');

    // Directly upload the new social preview image
    const input = await page.$('input#repo-image-file-input');
    if (!input) {
        console.error('Could not find the file input element.');
        await browser.close();
        process.exit(1);
    }
    await input.uploadFile('.github/og-image.png');  // Make sure this path is correct!
    console.log('Uploaded new social preview image.');

    // Submit the form
    await page.evaluate(() => {
        document.querySelector('form[action$="/settings/open-graph-image"]').submit();
    });
    console.log('Form submitted.');

    // Reload the page and verify that the social preview image was updated successfully
    // console.log('Social preview image updated successfully.');

    await browser.close();
    console.log('Browser closed.');
}

updateSocialPreview();