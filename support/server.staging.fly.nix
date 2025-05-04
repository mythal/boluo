{
  app = "boluo-server-staging";
  primary_region = "nrt";
  swap_size_mb = 512;

  build = {
    image = "ghcr.io/mythal/boluo/server:latest";
  };

  env = {
    HOST = "0.0.0.0";
    PORT = "3000";
    PUBLIC_MEDIA_URL = "http://media.dev.boluo.chat";
    S3_BUCKET_NAME = "boluo-development";
    S3_ENDPOINT_URL = "https://9a7f9f4ce45406e8224c0f1e9e6785b5.r2.cloudflarestorage.com";
  };

  http_service = {
    internal_port = 3000;
    force_https = true;
    auto_stop_machines = "stop";
    auto_start_machines = true;
    min_machines_running = 0;
    processes = [ "app" ];

    checks = [
      {
        interval = "20s";
        timeout = "5s";
        grace_period = "10s";
        method = "GET";
        path = "/api/info/healthcheck";
      }
    ];
  };

  vm = [
    {
      memory = "256mb";
      cpu_kind = "shared";
      cpus = 1;
    }
  ];
}
