# 3D 障害物回避ゲーム 設計書

## 1. プロジェクト概要

### 1.1 目的

Chrome の恐竜ゲームに似た、3D で障害物を避けるゲームを開発する。プレイヤーは 3D 空間内でキャラクターを操作し、迫り来る障害物を避けながら、できるだけ長く生き残ることを目指す。

### 1.2 主要機能

- 3D 空間での障害物回避ゲームプレイ
- スコア計算

### 1.3 技術スタック

- Three.js

## 3. 機能詳細

### 3.1 ゲームプレイ機能

- プレイヤーキャラクターの移動（上下左右・ジャンプ・しゃがむ）
- 障害物の自動生成と移動
- 衝突判定
- スコア計算（生存時間・距離に基づく）
- 難易度の段階的上昇（速度増加など）

## 4. 画面設計

### 4.1 ホーム画面

- ゲーム開始ボタン
- 難易度変更ボタン

### 4.2 ゲーム画面

- 3D 空間でのゲームプレイ
- 現在のスコア表示
- 一時停止ボタン
