{
  pkgs,
  commonEnv,
  boluo-site,
  commonImageContents,
  imageLabel,
  ...
}:
pkgs.dockerTools.buildImage {
  name = "boluo-site";
  tag = "latest";
  copyToRoot =
    with pkgs;
    commonImageContents
    ++ [
      curl
      nodejs
    ];
  runAsRoot = ''
    cp -r ${boluo-site} /app
  '';
  config = {
    Env = commonEnv ++ [
      "NEXT_TELEMETRY_DISABLED=1"
      "NODE_ENV=production"
    ];
    Cmd = [
      "node"
      "/app/apps/site/server.js"
    ];
    Labels = imageLabel;
  };
}
