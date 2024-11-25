require('dotenv').config();
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const GitHubAPI = require('./fetchRepoData');
const ImageGenerator = require('./renderImage');

const argv = yargs(hideBin(process.argv)).options({
    o: { type: 'string', alias: 'owner', default: 'octocat', describe: 'Repository owner' },
    r: { type: 'string', alias: 'repo', default: 'Hello-World', describe: 'Repository name' },
    h: { type: 'boolean', alias: 'headless', default: true, describe: 'Run in headless mode' }
}).argv;

const owner = argv.owner;
const repo = argv.repo;
const headless = argv.headless;
const keepOpen = !headless;

async function main() {
    console.log('Starting image generation process...');
    const api = new GitHubAPI(owner, repo, process.env.GITHUB_TOKEN);
    const repoData = await api.fetchRepoData();
    const contributorsCount = await api.fetchContributorsCount();
    const languages = await api.fetchLanguages();

    if (repoData && contributorsCount !== undefined && languages) {
        console.log('Fetched repository data, contributors count, and languages successfully.');
        const totalBytes = Object.values(languages).reduce((acc, bytes) => acc + bytes, 0);
        const languageDistribution = Object.entries(languages).map(([name, bytes]) => {
            const percentage = ((bytes / totalBytes) * 100).toFixed(2);
            console.log(`Language: ${name}, Percentage: ${percentage}%`);
            return {
                name,
                percentage,
                color: getColorForLanguage(name) // Function to get color for each language
            };
        });

        const data = {
            full_name: repoData.full_name,
            description: repoData.description || '',
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            contributors: contributorsCount,
            languages: Object.keys(languages).join(', '), // Convert languages to a comma-separated string
            language_distribution: languageDistribution
        };

        const templatesPath = path.join(__dirname, '..', 'templates');
        const baseURL = path.resolve(templatesPath).replace(/\\/g, '/');
        
        const imageGenerator = new ImageGenerator(templatesPath);
        const html = imageGenerator.renderTemplate(data, baseURL);
        console.log('Rendered HTML template successfully.');
        const imageBuffer = await imageGenerator.generateImage(html, baseURL, headless, keepOpen);
        console.log('Generated image buffer successfully.');

        const outputPath = path.join(process.cwd(), '.github/og-image.png');
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`OG image saved to ${outputPath}`);
    } else {
        console.error('Failed to fetch all data.');
    }
}

// Load the color pairings from linguist-colors.yml
let colors = {};
try {
    const fileContents = fs.readFileSync(path.join(__dirname, 'linguist-colors.yml'), 'utf8');
    colors = yaml.load(fileContents);
} catch (e) {
    console.log(e);
}

function getColorForLanguage(language) {
    return colors[language] || '#FFFFFF'; // Default to white if color not found
}

main();