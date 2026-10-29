#!/usr/bin/env bash
# Память проекта: напоминает Claude записать итоги в PROJECT_STATE.md (и CLAUDE.md), если в сессии менялись файлы игры.
#   start — в начале сессии запоминает, с какого коммита она началась;
#   stop  — когда Claude заканчивает ответ: если с начала сессии изменились файлы игры, а PROJECT_STATE.md нет,
#           один раз просит обновить его. На тот же набор изменений повторно не напоминает.
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null) || exit 0
BASE_FILE="$GIT_DIR/claude-session-base"
SEEN_FILE="$GIT_DIR/claude-memory-reminded"

if [ "$1" = start ]; then
  git rev-parse HEAD > "$BASE_FILE" 2>/dev/null
  rm -f "$SEEN_FILE"
  exit 0
fi

input=$(cat)
case "$input" in *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;; esac

base=$(cat "$BASE_FILE" 2>/dev/null)
git rev-parse --verify -q "$base^{commit}" >/dev/null || base=HEAD
changed=$( { git diff --name-only "$base"; git ls-files --others --exclude-standard; } 2>/dev/null | sort -u)

game=$(printf '%s\n' "$changed" | grep -E '^(index\.html|data\.js|assets/|tools/|docs/|tests/)')
[ -z "$game" ] && exit 0
printf '%s\n' "$changed" | grep -qx 'PROJECT_STATE.md' && exit 0

sig=$(printf '%s' "$game" | cksum)
[ "$sig" = "$(cat "$SEEN_FILE" 2>/dev/null)" ] && exit 0
printf '%s' "$sig" > "$SEEN_FILE"

files=$(printf '%s\n' "$game" | head -n 8 | paste -sd ',' - | sed 's/,/, /g')
more=$(( $(printf '%s\n' "$game" | wc -l) - 8 ))
[ "$more" -gt 0 ] && files="$files и ещё $more"
printf '{"decision":"block","reason":"Память проекта: в этой сессии изменились файлы игры (%s), а PROJECT_STATE.md нет. Если работа по задаче закончена, допиши итоги в PROJECT_STATE.md по правилам из CLAUDE.md (что сделано, что проверено и как, что осталось), а новые постоянные правила и договорённости — в CLAUDE.md. Если правка мелкая или задача ещё не закончена, ничего не записывай и коротко скажи об этом."}\n' "$files"
