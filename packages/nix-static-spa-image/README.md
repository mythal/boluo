# Nix Static SPA Image

This function builds a small Nginx container image for a static single-page
application.

## Usage

```nix
mkStaticSpaImage = import ./packages/nix-static-spa-image { inherit pkgs; };

image = mkStaticSpaImage {
  name = "example";
  webRoot = frontend;
  labels = {
    "org.opencontainers.image.source" = "https://example.com/repository";
  };
};
```
