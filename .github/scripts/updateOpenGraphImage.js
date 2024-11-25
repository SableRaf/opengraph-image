require('dotenv').config();
const path = require('path');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const GitHubAPI = require('./fetchRepoData');
const ImageGenerator = require('./renderImage');

const argv = yargs(hideBin(process.argv)).options({
    o: { type: 'string', alias: 'owner', default: 'octocat', describe: 'Repository owner' },
    r: { type: 'string', alias: 'repo', default: 'Hello-World', describe: 'Repository name' }
}).argv;

const owner = argv.owner;
const repo = argv.repo;

async function main() {
    console.log('Starting image generation process...');
    const api = new GitHubAPI(owner, repo, process.env.GITHUB_TOKEN);
    const repoData = await api.fetchRepoData();
    const contributorsCount = await api.fetchContributorsCount();

    if (repoData && contributorsCount !== undefined) {
        console.log('Fetched repository data and contributors count successfully.');
        const data = {
            full_name: repoData.full_name,
            description: repoData.description || '',
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            contributors: contributorsCount,
        };

        const templatesPath = path.join(__dirname, '..', 'templates');
        const baseURL = path.resolve(templatesPath).replace(/\\/g, '/');
        
        const imageGenerator = new ImageGenerator(templatesPath);
        const html = imageGenerator.renderTemplate(data);
        console.log('Rendered HTML template successfully.');
        const imageBuffer = await imageGenerator.generateImage(html, baseURL);
        console.log('Generated image buffer successfully.');

        const outputPath = path.join(process.cwd(), '.github/og-image.png');
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`OG image saved to ${outputPath}`);
    } else {
        console.error('Failed to fetch all data.');
    }
}

main();