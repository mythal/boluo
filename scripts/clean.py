#!/usr/bin/env python3

import subprocess
import shutil
import sys
from pathlib import Path


def run_command(command):
    try:
        subprocess.run(command, shell=True, check=True)
    except subprocess.CalledProcessError:
        sys.exit(1)


def main():
    print("Running cargo clean...")
    run_command("cargo clean")

    # Files to backup and restore
    files_to_handle = [".env.local", ".envrc", "docker-compose.override.yml"]

    # Perform backups
    for file_name in files_to_handle:
        file_path = Path(file_name)
        backup_path = Path(f"{file_name}.backup")

        if file_path.exists():
            print(f"Backing up {file_name}...")
            shutil.copy2(file_path, backup_path)

    print("Cleaning untracked files with git...")
    run_command("git clean -fdX")

    # Restore backups
    for file_name in files_to_handle:
        backup_path = Path(f"{file_name}.backup")
        target_path = Path(file_name)

        if backup_path.exists():
            print(f"Restoring {file_name}...")
            shutil.move(str(backup_path), str(target_path))


if __name__ == "__main__":
    main()
