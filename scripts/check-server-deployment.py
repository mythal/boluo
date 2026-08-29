import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, NoReturn

REVISION_LABEL = "org.opencontainers.image.revision"
WORKSPACE = Path(os.environ.get("GITHUB_WORKSPACE", Path.cwd())).resolve()

DEPLOYMENTS = {
    ("server", "production"): (
        "boluo-server",
        [
            "packages.x86_64-linux.server-image.drvPath",
            "packages.x86_64-linux.deploy-server-production.outPath",
        ],
    ),
    ("server", "staging"): (
        "boluo-server-staging",
        [
            "packages.x86_64-linux.server-image.drvPath",
            "packages.x86_64-linux.deploy-server-staging.outPath",
        ],
    ),
    ("site", "staging"): (
        "boluo-site-staging",
        [
            "packages.x86_64-linux.site-image.drvPath",
            "packages.x86_64-linux.deploy-site-staging.outPath",
        ],
    ),
}

deployment_service = "server"


def required_environment_variable(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is not set")
    return value


def run(command: list[str]) -> str:
    result = subprocess.run(
        command,
        cwd=WORKSPACE,
        env=os.environ,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        message = (
            result.stderr.strip()
            or f"{command[0]} exited with code {result.returncode}"
        )
        raise RuntimeError(message)
    return result.stdout.strip()


def write_result(required: bool, message: str) -> None:
    output = f"required={str(required).lower()}\n"
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with Path(github_output).open("a", encoding="utf-8") as output_file:
            output_file.write(output)
    else:
        sys.stdout.write(output)
    print(f"::notice title={deployment_service.title()} deployment::{message}")


def require_deployment(message: str) -> NoReturn:
    write_result(True, f"{message} Deploying conservatively.")
    raise SystemExit(0)


def object_field(value: object, name: str) -> object | None:
    return value.get(name) if isinstance(value, dict) else None


def revision_for(machine: dict[str, Any]) -> str | None:
    config = object_field(machine, "config")
    env = object_field(config, "env")
    app_version = object_field(env, "APP_VERSION")
    if isinstance(app_version, str):
        return app_version

    image_ref = object_field(machine, "image_ref")
    labels = object_field(image_ref, "labels")
    revision = object_field(labels, REVISION_LABEL)
    return revision if isinstance(revision, str) else None


def evaluate_fingerprint(flake: str, attributes: list[str]) -> list[str]:
    return [
        run(
            [
                "nix",
                "eval",
                "--quiet",
                "--raw",
                "--no-update-lock-file",
                f"{flake}#{attribute}",
            ]
        )
        for attribute in attributes
    ]


def main() -> None:
    global deployment_service

    deployment_service = os.environ.get("DEPLOYMENT_SERVICE", "server")
    deployment_environment = required_environment_variable("DEPLOYMENT_ENV")
    deployment = DEPLOYMENTS.get((deployment_service, deployment_environment))
    if deployment is None:
        raise RuntimeError(
            "Unsupported deployment: "
            f"{deployment_service} in {deployment_environment}"
        )
    fly_app, deployment_attributes = deployment

    try:
        machine_data: object = json.loads(
            run(["flyctl", "machine", "list", "--app", fly_app, "--json"])
        )
    except (json.JSONDecodeError, OSError, RuntimeError) as error:
        print(error, file=sys.stderr)
        require_deployment("Could not query the deployed server.")

    if not isinstance(machine_data, list) or not all(
        isinstance(machine, dict) for machine in machine_data
    ):
        require_deployment("Fly returned an invalid Machine list.")

    machines: list[dict[str, Any]] = machine_data
    active_machines = [
        machine
        for machine in machines
        if machine.get("state") != "destroyed" and machine.get("cordoned") is not True
    ]
    revisions = [revision_for(machine) for machine in active_machines]
    unique_revisions = set(revisions)
    if not active_machines or None in unique_revisions or len(unique_revisions) != 1:
        require_deployment(
            f"The deployed {deployment_service} revision is missing or inconsistent."
        )

    deployed_revision = unique_revisions.pop()
    if (
        deployed_revision is None
        or len(deployed_revision) != 40
        or any(character not in "0123456789abcdef" for character in deployed_revision)
    ):
        require_deployment(
            f"The deployed {deployment_service} revision is invalid."
        )

    current_fingerprint = evaluate_fingerprint(".", deployment_attributes)
    deployed_flake = f"git+{WORKSPACE.as_uri()}?rev={deployed_revision}"
    try:
        deployed_fingerprint = evaluate_fingerprint(
            deployed_flake, deployment_attributes
        )
    except (OSError, RuntimeError) as error:
        print(error, file=sys.stderr)
        require_deployment(
            f"Could not evaluate the deployed {deployment_service} revision."
        )

    print(f"Deployed {deployment_service} revision: {deployed_revision}")
    if current_fingerprint == deployed_fingerprint:
        write_result(
            False,
            f"{deployment_service.title()} deployment is unchanged from "
            f"{deployed_revision}; skipping Fly deploy.",
        )
    else:
        write_result(
            True,
            f"{deployment_service.title()} deployment changed from "
            f"{deployed_revision}; Fly deploy is required.",
        )


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError) as error:
        print(error, file=sys.stderr)
        raise SystemExit(1) from error
