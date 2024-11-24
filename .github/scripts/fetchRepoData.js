const fetch = require('node-fetch');

class GitHubAPI {
    constructor(owner, repo, token) {
        this.apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
        this.headers = {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${token}`,
        };
    }

    async fetchRepoData() {
        console.log(`Fetching repository data from ${this.apiUrl}`);
        try {
            const response = await fetch(this.apiUrl, { headers: this.headers });
            if (!response.ok) {
                throw new Error(`GitHub API responded with status ${response.status}`);
            }
            console.log('Repository data fetched successfully.');
            return await response.json();
        } catch (error) {
            console.error('Error fetching repository data:', error);
        }
    }

    async fetchContributorsCount() {
        console.log(`Fetching contributors count from ${this.apiUrl}/contributors`);
        try {
            const response = await fetch(`${this.apiUrl}/contributors?per_page=1&anon=true`, { headers: this.headers });
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

            console.log(`Contributors count fetched successfully: ${contributorsCount}`);
            return contributorsCount;
        } catch (error) {
            console.error('Error fetching contributors count:', error);
        }
    }
}

module.exports = GitHubAPI;