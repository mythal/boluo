{
  pkgs,
}:
{
  name,
  webRoot,
  labels ? { },
  port ? "80",
}:
let
  nginxConf = pkgs.writeText "nginx.conf" ''
    user nobody nobody;
    worker_processes auto;
    daemon off;
    error_log /dev/stderr warn;
    pid /dev/null;
    events {}
    http {
      include ${pkgs.nginx}/conf/mime.types;
      access_log /dev/stdout;
      server_tokens off;
      server {
        server_name _;
        listen ${port};
        listen [::]:${port};
        index index.html index.htm;
        location / {
          root ${webRoot};
          try_files $uri $uri/ $uri.html /index.html;
        }
        location = /api {
          return 404;
        }
        location ^~ /api/ {
          return 404;
        }
      }
    }
  '';
in
pkgs.dockerTools.buildLayeredImage {
  inherit name;
  tag = "latest";

  contents = [
    pkgs.fakeNss
    pkgs.nginx
  ];
  extraCommands = ''
    mkdir -p tmp/nginx_client_body

    # nginx still tries to read this directory even if error_log directive is
    # specifying another file :/
    mkdir -p var/log/nginx
  '';
  config = {
    Cmd = [
      "nginx"
      "-c"
      nginxConf
    ];
    ExposedPorts = {
      "${port}/tcp" = { };
    };
    Labels = labels;
  };
}
