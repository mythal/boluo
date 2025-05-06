{
  pkgs,
  commonEnv,
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
    Env = commonEnv ++ [
      "NEXT_TELEMETRY_DISABLED=1"
    ];
    Cmd = [
      "${boluo-site}/bin/boluo-site"
    ];
    Labels = imageLabel;
  };
}
