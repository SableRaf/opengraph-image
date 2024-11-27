require('dotenv').config();
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const GitHubAPI = require('./fetchRepoData');
const ImageGenerator = require('./renderImage');
const sharp = require('sharp'); 
const readline = require('readline');

const argv = yargs(hideBin(process.argv)).options({
    o: { type: 'string', alias: 'owner', describe: 'Repository owner' },
    r: { type: 'string', alias: 'repo', describe: 'Repository name' },
    h: { type: 'boolean', alias: 'headless', default: true, describe: 'Run in headless mode' }
}).argv;

const configPath = path.join(__dirname, '../config.yml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

let owner = argv.owner || config.repo.owner;
let repo = argv.repo || config.repo.name;
const headless = argv.headless;
const keepOpen = !headless;

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, answer => {
        rl.close();
        resolve(answer);
    }));
}

const cacheFilePath = path.join(process.cwd(), '.github/cache.json');

function loadCache() {
    if (fs.existsSync(cacheFilePath)) {
        const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
        const cache = JSON.parse(cacheContent);
        if (cache.owner === owner && cache.repo === repo) {
            return cache;
        }
    }
    return {};
}

function saveCache(data) {
    data.owner = owner;
    data.repo = repo;
    fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2));
}

function formatNumber(num) {
    if (num >= 1000000) {
        return Math.floor(num / 1000000) + 'M';
    }
    if (num >= 1000) {
        return Math.floor(num / 1000) + 'k';
    }
    return num.toString();
}

async function main() {
    console.log('Starting image generation process...');
    if (!owner || !repo) {
        const [argOwner, argRepo] = argv._[0]?.split('/') || [];
        if (argOwner && argRepo) {
            owner = argOwner;
            repo = argRepo;
        } else {
            owner = await askQuestion('Please provide the repository owner: ');
            repo = await askQuestion('Please provide the repository name: ');
        }
    }
    const cache = loadCache();
    const api = new GitHubAPI(owner, repo, process.env.GITHUB_TOKEN);

    let repoData = cache.repoData;
    let contributorsCount = cache.contributorsCount;
    let languages = cache.languages;

    if (!repoData || !contributorsCount || !languages) {
        repoData = await api.fetchRepoData();
        contributorsCount = await api.fetchContributorsCount();
        languages = await api.fetchLanguages();

        cache.repoData = repoData;
        cache.contributorsCount = contributorsCount;
        cache.languages = languages;
        saveCache(cache);
    } else {
        console.log('Loaded data from cache.');
    }

    if (repoData && contributorsCount !== undefined && languages) {
        console.log('Fetched repository data, contributors count, and languages successfully.');
        if (Object.keys(languages).length === 0) {
            console.warn('No languages found for this repository. Skipping language distribution.');
        }
        const totalBytes = Object.values(languages).reduce((acc, bytes) => acc + bytes, 0);
        const languageDistribution = Object.entries(languages).map(([name, bytes]) => {
            const percentage = ((bytes / totalBytes) * 100).toFixed(2);
            return {
                name,
                percentage,
                color: getColorForLanguage(name) // Function to get color for each language
            };
        });

        const maxFontSize = 84;
        const minFontSize = 62;
        const nameLength = `${owner}/${repo}`.length;
        let fontSize = maxFontSize - (nameLength - 20) * 1.5;
        fontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));
        
        const data = {
            owner: owner,
            repo_name: repo,
            description: repoData.description || '',
            stars: repoData.stargazers_count > 0 ? formatNumber(repoData.stargazers_count) : null, // Use formatted number
            forks: repoData.forks_count > 0 ? formatNumber(repoData.forks_count) : null, // Use formatted number
            contributors: contributorsCount > 0 ? formatNumber(contributorsCount) : null, // Use formatted number
            issues: repoData.open_issues_count > 0 ? formatNumber(repoData.open_issues_count) : null, // Use formatted number
            discussions: repoData.discussions_count > 0 ? formatNumber(repoData.discussions_count) : null, // Use formatted number
            languages: Object.keys(languages).join(', '),
            language_distribution: languageDistribution,
            font_size: `${fontSize}px`,
            profile_picture_url: repoData.owner.avatar_url,
            config: config.elements, // Pass configuration to the template
            background_image: config.backgroundImage
        };

        const templatesPath = path.join(__dirname, '..', 'templates');
        const baseURL = path.resolve(templatesPath).replace(/\\/g, '/');
        
        const imageGenerator = new ImageGenerator(templatesPath);
        const html = imageGenerator.renderTemplate(data, baseURL);
        console.log('Rendered HTML template successfully.');
        const imageBuffer = await imageGenerator.generateImage(html, baseURL, headless, keepOpen, {
            defaultViewport: { width: 1280, height: 640, deviceScaleFactor: 1 }
        });
        console.log('Generated image buffer successfully.');

        // Compress the image to ensure it is under 1MB
        const compressedImageBuffer = await sharp(imageBuffer)
            .png({ quality: 80, compressionLevel: 9 })
            .toBuffer();
        console.log('Compressed image buffer successfully.');

        const outputPath = path.join(process.cwd(), config.outputPath || '.github/og-image.png');
        fs.writeFileSync(outputPath, compressedImageBuffer);
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