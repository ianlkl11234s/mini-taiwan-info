# Push 失敗 Fallback

> Stage 5 Checkpoint D 配套。Session 3 + 5 累積撞過的所有 push 障礙。

## A. Secret scanning 擋 push

**訊息含**：`push declined due to repository rule violations` + `secret-scanning/unblock-secret/...`

**自動處理**：
1. `grep -rn "pk\\.eyJ\\|sk_\\|AKIA\\|ghp_\\|gho_" \\` 找出所有 token
2. 列出來給 user 看 + `AskUserQuestion` 問：
   - **A1**. `git filter-repo --replace-text` rewrite history（推薦）
   - **A2**. GitHub URL allow 一次（user 自己點 unblock）
   - **A3**. 改 .gitignore 把 designs/ 或 prototype/ 整個排除

3. 若選 A1：
   ```bash
   # backup
   cp -r {repo} /tmp/{repo}.bak-pre-filterrepo
   # working tree 改 placeholder + commit
   # 寫 /tmp/replace.txt: <token>==><placeholder>
   git filter-repo --replace-text /tmp/replace.txt --force
   # filter-repo 會 remove remote，要重 add
   git remote add origin <url>
   git push -u origin main --force
   ```

## B. Remote 有 user 沒有的 commits（fetch first 場景）

**訊息含**：`! [rejected] main -> main (non-fast-forward)` 或 `Updates were rejected because the remote contains work that you do not have locally`

**處理**：
1. 跑 `git fetch origin && git rev-list --left-right --count origin/main...HEAD` 看 divergence
2. 列 remote-only commits 給 user：`git log --oneline HEAD..origin/main`
3. 預設 `git pull --rebase origin main` 後 push
4. 衝突就停下來給 user 處理（不自動 resolve）

**Session 5 範例**：gis-platform 有 1 個 user 在其他 session 推的 `chore(_auto): sync portfolio status`，rebase 後 push 成功。

## C. 三個 repo 同步

- mini-taiwan-info（本專案 main）
- gis-platform（migrations，main）
- taipei-gis-analytics（pipelines，**master 不是 main**）
- data-collectors（sibling，本 cycle 通常不動）

對每個 repo 個別跑：
```bash
cd <repo_path>
git fetch origin
git rev-list --left-right --count origin/${BRANCH}...HEAD
# behind > 0 → pull --rebase
# ahead > 0 且 behind = 0 → 可以直接 push
```

只 push 本 session 真實有 commit 的 repo。對其他 repo 用 `git log @{u}..HEAD` 確認有 ahead 才 push。

**Tip**：直接呼叫 `/cross-repo-status` skill 拿完整盤點報告，比逐個 git status 快。

## D. Branch protection 擋

**訊息含**：`protected branch hook declined` / `required status check failed`

**處理**：
- `main` / `master` 通常 mini-taiwan-info / gis-platform / taipei-gis 都沒設 protection（個人 repo）→ 該錯不會出現
- 若 user 之後上 protection → 改用 PR flow（`gh pr create`），本 skill 範圍外，要 user 拍板

## E. SSH key 過期 / GitHub 2FA

**訊息含**：`Permission denied (publickey)` / `Could not read from remote repository`

**處理**：跳出讓 user 處理（重新 ssh-add / refresh token），不自動 fix。

## F. LFS quota 滿

**訊息含**：`This repository is over its data quota`

**處理**：本專案目前無 LFS，理論不會撞。撞到先停下來給 user 確認檔案分類。

## 預設順序（無錯就跑 A → B → C 全 push）

```bash
# 1. 對 3 repo 各跑（並行）
for repo_branch in "mini-taiwan-info:main" "gis-platform:main" "taipei-gis-analytics:master"; do
  repo=${repo_branch%:*}; branch=${repo_branch#*:}
  cd /.../GIS/$repo && git fetch origin -q
  divergence=$(git rev-list --left-right --count origin/$branch...HEAD)
  behind=${divergence%	*}; ahead=${divergence#*	}
  echo "$repo: behind=$behind ahead=$ahead"

  # 0 ahead → skip
  [ "$ahead" = "0" ] && continue

  # behind > 0 → rebase
  [ "$behind" != "0" ] && git pull --rebase origin $branch

  # push
  git push origin $branch
done
```

## 不做的事

- ❌ `git push --force` 除非走完 filter-repo flow + user 明確同意
- ❌ 自動 unblock secret（user 必須自己決定 token 是否安全）
- ❌ 跨 repo 跳脫順序 push（保持 mini → gis → taipei 一致性）

## 何時更新本檔

- 撞到新的 push reject pattern（GitHub 推新 enforcement）→ 加新 fallback
- 改 repo 結構（如改用 squash merge / PR-only）→ 全面改寫
- 新增 sibling repo → C 章節更新
