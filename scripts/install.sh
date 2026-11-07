#!/bin/sh
# 開発モードで一度ビルドして Raycast に読み込ませ、すぐに開発モードを抜ける。
# 開発モードを抜けても拡張は Raycast に残る。
set -eu

log=$(mktemp)
trap 'rm -f "$log"' EXIT

pnpm exec ray develop --non-interactive >"$log" 2>&1 &
pid=$!

i=0
until grep -q "built extension successfully" "$log"; do
  if ! kill -0 "$pid" 2>/dev/null || [ "$i" -ge 120 ]; then
    cat "$log"
    echo "インストールに失敗しました" >&2
    kill "$pid" 2>/dev/null || true
    exit 1
  fi
  i=$((i + 1))
  sleep 1
done

# Raycast が読み込み終わるのを少し待ってから開発モードを終了する
sleep 2
kill -INT "$pid"
wait "$pid" 2>/dev/null || true
echo "Raycast にインストールしました。Raycast で「Quick Calendar JA」を開いてください。"
