require('dotenv').config();
const fetch = require('node-fetch');

const owner = 'processing';
const repo = 'p5.js';

const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'Authorization': `token ${process.env.GITHUB_TOKEN}`,
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

async function main() {
  const repoData = await fetchRepoData();
  const contributorsCount = await fetchContributorsCount();

  if (repoData && contributorsCount !== undefined) {
    console.log('Repository Name:', repoData.full_name);
    console.log('Description:', repoData.description);
    console.log('Stars:', repoData.stargazers_count);
    console.log('Forks:', repoData.forks_count);
    console.log('Contributors:', contributorsCount);
  } else {
    console.error('Failed to fetch all data.');
  }
}

main();
