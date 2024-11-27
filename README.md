# Repo OpenGraph Image Generator

By default, GitHub creates an OpenGraph image for your repository that includes information about your repository. You can also customize this by providing a custom image. However, a static image will not include dynamic information about your repository.

This tool generates an OG image that displays the repository details and stats. The method is inspired by [this post](https://github.blog/open-source/git/framework-building-open-graph-images/) on the GitHub blog.

## Usage

Navigate to the `.github/scripts` directory and run the following command:

```
node updateOpenGraphImage.js repoOwner/repoName
```

This will generate a new image `og-image.png` in the `.github` directory.

### Configuration

Edit `config.yml` to configure the image generation parameters. You can set the source repository and define the elements to be included in the image.

Refer to the comments in the file for guidance.

### Local Usage

1. run `npm install` to install the dependencies.
2. run `npm run generate` to generate the image.

### GitHub Actions Configuration

[TBD]

## References

- [A framework for building Open Graph images](https://github.blog/open-source/git/framework-building-open-graph-images/)
- [Custom Open Graph Images for repositories (GitHub Blog)](https://github.blog/news-insights/product-news/custom-open-graph-images-for-repositories/)
- [Octicons](https://primer.style/foundations/icons). A scalable set of icons handcrafted by GitHub.
- [Mona Sans](https://github.com/github/mona-sans). A free, open source, sans serif typeface used by GitHub.

## Similar Projects

- https://github.com/potatoqualitee/ogimage