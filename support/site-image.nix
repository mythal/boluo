{
  pkgs,
  certEnv,
  boluo-site,
  commonImageContents,
  imageLabel,
  ...
}:
pkgs.dockerTools.buildLayeredImage {
  name = "boluo-site";
  tag = "latest";
  contents =
    with pkgs;
    commonImageContents
    ++ [
      curl
    ];
  config = {
    Env = certEnv ++ [
      "NEXT_TELEMETRY_DISABLED=1"
    ];
    Cmd = [ "${pkgs.nodejs}/bin/nodejs ${boluo-site}/apps/site/server.js" ];
    Labels = imageLabel;
  };
}
