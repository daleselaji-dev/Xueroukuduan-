# Repo-driven deployment

This site treats the GitHub repository as the content database and source of truth.

## Contribution flow

1. Contributors fork `BoHuYeShan/flesh-is-weak-seminar`.
2. Contributors add or edit content in GitHub Discussions, `submissions/`, or generated data files.
3. Contributors open a pull request back to the upstream repository.
4. Maintainers review and merge.
5. The server pulls the upstream repository, builds VitePress, and publishes the result on port `8082`.

## Server deployment

The server script is `ops/deploy-from-github.sh`.

Required environment:

```bash
APP_ROOT=/opt/flesh-is-weak-seminar
REPO_URL=https://github.com/daleselaji-dev/Xueroukuduan-.git
BRANCH=main
```

Run manually:

```bash
sudo APP_ROOT=/opt/flesh-is-weak-seminar REPO_URL=https://github.com/daleselaji-dev/Xueroukuduan-.git BRANCH=main bash ops/deploy-from-github.sh
```

For a personal fork or gray release, change `REPO_URL` or `BRANCH`.

The API database is not stored in GitHub. It stays on the server under `/opt/flesh-is-weak-seminar/api/data`.

## Nginx

Use `ops/nginx-flesh-seminar-8082.conf` for the public site. The CSP intentionally allows VitePress inline bootstrap scripts; removing `'unsafe-inline'` from `script-src` leaves the site stuck before hydration.
