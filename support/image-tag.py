#!/usr/bin/env python3
'''
Calculate the image tag based on the branch name.
'''

import os
import sys

branch = os.getenv("BRANCH_NAME").strip()

if not branch:
    print("BRANCH_NAME environment variable is not set.", file=sys.stderr)
    sys.exit(1)

if branch in ["main", "master"]:
    print("latest")
elif branch.startswith("release/") or branch == "production":
    print("production")
elif branch.startswith("staging/"):
    print("staging")
else:
    print(branch)
