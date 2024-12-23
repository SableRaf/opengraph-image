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
            const repoData = await response.json();
            const discussionsResponse = await fetch(`${this.apiUrl}/discussions`, { headers: this.headers });
            if (discussionsResponse.ok) {
                const discussionsData = await discussionsResponse.json();
                repoData.discussions_count = discussionsData.total_count;
            } else {
                repoData.discussions_count = 0;
            }
            console.log('Repository data fetched successfully.');
            return repoData;
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

    async fetchLanguages() {
        console.log(`Fetching languages from ${this.apiUrl}/languages`);
        try {
            const response = await fetch(`${this.apiUrl}/languages`, { headers: this.headers });
            if (!response.ok) {
                throw new Error(`GitHub API responded with status ${response.status}`);
            }
            const languages = await response.json();
            if (Object.keys(languages).length === 0) {
                console.warn('No languages found for this repository.');
            } else {
                console.log('Languages fetched successfully:', languages); 
            }
            return languages;
        } catch (error) {
            console.error('Error fetching languages:', error);
        }
    }
}

module.exports = GitHubAPI;