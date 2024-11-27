This node.js tool generates a custom [OpenGraph](https://www.opengraph.xyz/) image that displays the repository details and stats. Your can choose what elements are included in the image and even use a custom background.

![Repo OpenGraph Image](example-og-image.png)

The image is generated using [puppeteer](https://github.com/GoogleChrome/puppeteer) and [sharp](https://github.com/lovell/sharp). The method is inspired by [this post](https://github.blog/open-source/git/framework-building-open-graph-images/) on the GitHub blog.

## Usage

### Configuration

Edit `config.yml` to configure the image generation parameters. You can set the source repository and define the elements to be included in the image. Refer to the comments in the file for guidance.

### Local Setup

Create a new GitHub token [here](https://github.com/settings/tokens) with read_repo permissions and add it to the `.env` file.

Create a `.env` file in the root directory containing the following:
```
GITHUB_TOKEN=<your github token>
```
Use the actual GitHub token instead of `<your github token>`.

> [!WARNING]
> Make sure to add `.env` to your `.gitignore` file to avoid accidentally committing your token to the repository.

### Local Usage

1. run `npm install` to install the dependencies.
2. run `npm run generate` to generate the image.

### Custom template

If you know html/css and want to use a custom template, you can edit `template.html` to customize the layout, or create a new template and update the `templatePath` in `config.yml`.

### GitHub Actions Configuration

1. Set GITHUB_TOKEN Permissions:
- Go to repository `Settings → Actions → General → Workflow permissions`.
- Enable: Read and write permissions.
- Click `Save`.

## References

- [A framework for building Open Graph images](https://github.blog/open-source/git/framework-building-open-graph-images/)
- [Custom Open Graph Images for repositories (GitHub Blog)](https://github.blog/news-insights/product-news/custom-open-graph-images-for-repositories/)
- [Octicons](https://primer.style/foundations/icons). A scalable set of icons handcrafted by GitHub.
- [Mona Sans](https://github.com/github/mona-sans). A free, open source, sans serif typeface used by GitHub.

## Similar Projects

- https://github.com/potatoqualitee/ogimage