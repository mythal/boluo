{
  pkgs,
  legacy,
  imageLabel,
  ...
}:
# https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/docker/examples.nix
let
  webRoot = legacy;
  nginxPort = "80";
  nginxConf = pkgs.writeText "nginx.conf" ''
    user nobody nobody;
    daemon off;
    error_log /dev/stdout info;
    pid /dev/null;
    events {}
    http {
      include ${pkgs.nginx}/conf/mime.types;
      access_log /dev/stdout;
      server {
        server_name _;
        listen ${nginxPort};
        listen [::]:${nginxPort};
        index index.html index.htm;
        location / {
          root ${webRoot};
          try_files $uri $uri/ $uri.html /index.html;
        }
        location /api {
          return 404;
        }
      }
    }
  '';
in
pkgs.dockerTools.buildLayeredImage {
  name = "boluo-legacy";
  tag = "latest";

  contents = [
    pkgs.fakeNss
    pkgs.nginx
  ];
  extraCommands = ''
    mkdir -p tmp/nginx_client_body

    # nginx still tries to read this directory even if error_log
    # directive is specifying another file :/
    mkdir -p var/log/nginx
  '';
  config = {
    Cmd = [
      "nginx"
      "-c"
      nginxConf
    ];
    ExposedPorts = {
      "${nginxPort}/tcp" = { };
    };
    Labels = imageLabel;
  };
}
