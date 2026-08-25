# Soft Git hooks

Install and verify the clone-local configuration plus the repository-backed
Cursor and Copilot entrypoints:

```sh
./enforcement/bootstrap.sh --install
./enforcement/bootstrap.sh --check
```

Manual hook-only fallback: `git config --local core.hooksPath .githooks`.

These hooks **warn** and exit 0.

## Make commit-msg a hard blocker later

```sh
# one shell
AOC_HOOKS_HARD=1 git commit -m "..."

# or permanently for this clone
git config --local aoc.hooksHard true
```

Then change `commit-msg` to treat `git config --get aoc.hooksHard` as `1`,
or export `AOC_HOOKS_HARD=1` in your environment. Shortest path: export the
variable. The hook already honors it.
