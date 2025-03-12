// ゲームの状態
const gameState = {
    isPlaying: false,
    isPaused: false,
    score: 0,
    difficulty: 1, // 1-10の難易度
    speed: 0.2,
    obstacleSpawnRate: 1.5, // 秒
    lastObstacleTime: 0,
    difficultyLevels: ['レベル1', 'レベル2', 'レベル3', 'レベル4', 'レベル5', 'レベル6', 'レベル7', 'レベル8', 'レベル9', 'レベル10']
};

// DOM要素
const homeScreen = document.getElementById('home-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const restartButton = document.getElementById('restart-button');
const homeButton = document.getElementById('home-button');
const difficultyButton = document.getElementById('difficulty-button');
const difficultyLevel = document.getElementById('difficulty-level');
const scoreValue = document.getElementById('score-value');
const finalScore = document.getElementById('final-score');

// Three.js関連の変数
let scene, camera, renderer, player, ground, obstacles = [], clock;
let playerSize = { width: 1, height: 1, depth: 1 };
let groundSize = { width: 20, depth: 100 };
let lanes = [-3, 0, 3]; // 左、中央、右のレーン
let playerLane = 1; // 中央レーン（0: 左, 1: 中央, 2: 右）
let isJumping = false;
let isCrouching = false;
let jumpHeight = 3;
let jumpSpeed = 0.15;
let jumpPosition = 0;
let jumpDirection = 1; // 1: 上昇, -1: 下降

// キー入力の状態
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

// ゲーム初期化
function initGame() {
    // Three.jsのセットアップ
    setupThreeJS();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // アニメーションループの開始
    animate();
}

// Three.jsのセットアップ
function setupThreeJS() {
    // シーンの作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // 空色の背景
    
    // カメラの作成
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, -10);
    camera.lookAt(0, 0, 20);
    
    // レンダラーの作成
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // 光源の追加
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 0);
    scene.add(directionalLight);
    
    // 地面の作成
    createGround();
    
    // プレイヤーの作成
    createPlayer();
    
    // 時計の作成（時間管理用）
    clock = new THREE.Clock();
}

// 地面の作成
function createGround() {
    const groundGeometry = new THREE.BoxGeometry(groundSize.width, 0.5, groundSize.depth);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -0.75;
    ground.receiveShadow = true;
    scene.add(ground);
}

// プレイヤーの作成
function createPlayer() {
    const playerGeometry = new THREE.BoxGeometry(playerSize.width, playerSize.height, playerSize.depth);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x2196F3 });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(lanes[playerLane], playerSize.height / 2, 0);
    player.castShadow = true;
    scene.add(player);
}

// 障害物の作成
function createObstacle() {
    // ランダムなレーンを選択
    const lane = Math.floor(Math.random() * 3);
    
    // ランダムな障害物タイプを選択（0: 低い障害物, 1: 高い障害物）
    const type = Math.floor(Math.random() * 2);
    
    let obstacleWidth = 1.5;
    let obstacleHeight = type === 0 ? 1 : 2.5;
    let obstacleDepth = 1.5;
    
    const obstacleGeometry = new THREE.BoxGeometry(obstacleWidth, obstacleHeight, obstacleDepth);
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xFF5722 });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    
    // 障害物の位置設定
    obstacle.position.set(lanes[lane], obstacleHeight / 2, 50);
    obstacle.castShadow = true;
    
    // 障害物の情報を保存
    obstacle.userData = {
        type: type,
        lane: lane
    };
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

// 障害物の更新
function updateObstacles(deltaTime) {
    // 新しい障害物の生成
    gameState.lastObstacleTime += deltaTime;
    if (gameState.lastObstacleTime > gameState.obstacleSpawnRate) {
        createObstacle();
        gameState.lastObstacleTime = 0;
    }
    
    // 障害物の移動
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.position.z -= gameState.speed * deltaTime * 60;
        
        // 画面外に出た障害物を削除
        if (obstacle.position.z < -10) {
            scene.remove(obstacle);
            obstacles.splice(i, 1);
            
            // スコア加算
            updateScore(10);
        }
        
        // 衝突判定
        if (checkCollision(player, obstacle)) {
            gameOver();
        }
    }
}

// 衝突判定
function checkCollision(player, obstacle) {
    if (!gameState.isPlaying || gameState.isPaused) return false;
    
    const playerBox = new THREE.Box3().setFromObject(player);
    const obstacleBox = new THREE.Box3().setFromObject(obstacle);
    
    return playerBox.intersectsBox(obstacleBox);
}

// プレイヤーの更新
function updatePlayer(deltaTime) {
    // レーン移動
    const targetX = lanes[playerLane];
    player.position.x += (targetX - player.position.x) * 0.1 * deltaTime * 60;
    
    // ジャンプ処理
    if (isJumping) {
        jumpPosition += jumpSpeed * jumpDirection * deltaTime * 60;
        
        // ジャンプの頂点に達したら下降開始
        if (jumpPosition >= jumpHeight) {
            jumpDirection = -1;
        }
        
        // 着地したらジャンプ終了
        if (jumpPosition <= 0 && jumpDirection === -1) {
            jumpPosition = 0;
            isJumping = false;
            jumpDirection = 1;
            player.scale.set(1, 1, 1);
        }
        
        player.position.y = playerSize.height / 2 + jumpPosition;
    }
    
    // しゃがみ処理
    if (isCrouching && !isJumping) {
        player.scale.set(1, 0.5, 1);
        player.position.y = playerSize.height / 4;
    } else if (!isJumping) {
        player.scale.set(1, 1, 1);
        player.position.y = playerSize.height / 2;
    }
}

// スコアの更新
function updateScore(points) {
    gameState.score += points;
    scoreValue.textContent = gameState.score;
    
    // 難易度の調整（スコアに応じて速度を上げる）
    // 10段階難易度に合わせて調整
    gameState.speed = 0.2 + (gameState.score / 1000) * 0.1 * (gameState.difficulty / 3);
    gameState.obstacleSpawnRate = Math.max(0.5, 1.5 - (gameState.score / 2000) * 0.5 * (gameState.difficulty / 3));
}

// ゲームオーバー処理
function gameOver() {
    gameState.isPlaying = false;
    finalScore.textContent = gameState.score;
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

// ゲームリセット
function resetGame() {
    // スコアリセット
    gameState.score = 0;
    scoreValue.textContent = '0';
    
    // 速度リセット（10段階難易度に合わせて調整）
    gameState.speed = 0.2 * (gameState.difficulty / 3);
    gameState.obstacleSpawnRate = 1.5 / (gameState.difficulty / 3);
    gameState.lastObstacleTime = 0;
    
    // 障害物の削除
    for (const obstacle of obstacles) {
        scene.remove(obstacle);
    }
    obstacles = [];
    
    // プレイヤーの位置リセット
    playerLane = 1;
    player.position.set(lanes[playerLane], playerSize.height / 2, 0);
    player.scale.set(1, 1, 1);
    isJumping = false;
    isCrouching = false;
    jumpPosition = 0;
    jumpDirection = 1;
}

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    if (gameState.isPlaying && !gameState.isPaused) {
        updatePlayer(deltaTime);
        updateObstacles(deltaTime);
        
        // 時間経過によるスコア加算
        updateScore(0.1);
    }
    
    renderer.render(scene, camera);
}

// イベントリスナーの設定
function setupEventListeners() {
    // ウィンドウリサイズ時の処理
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // キー入力の処理
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = true;
            handleKeyInput();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = false;
            
            // しゃがみ解除
            if (e.code === 'ArrowDown') {
                isCrouching = false;
            }
        }
    });
    
    // ボタンクリックの処理
    startButton.addEventListener('click', startGame);
    pauseButton.addEventListener('click', togglePause);
    restartButton.addEventListener('click', restartGame);
    homeButton.addEventListener('click', goToHome);
    difficultyButton.addEventListener('click', changeDifficulty);
    
    // タッチ操作のサポート
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
}

// キー入力の処理
function handleKeyInput() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    // 左移動
    if (keys.ArrowLeft && playerLane > 0) {
        playerLane--;
    }
    
    // 右移動
    if (keys.ArrowRight && playerLane < 2) {
        playerLane++;
    }
    
    // ジャンプ
    if ((keys.ArrowUp || keys.Space) && !isJumping) {
        isJumping = true;
        jumpPosition = 0;
        jumpDirection = 1;
    }
    
    // しゃがみ
    if (keys.ArrowDown && !isJumping) {
        isCrouching = true;
    }
}

// タッチ操作の処理
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY;
    
    // 左右スワイプでレーン移動
    if (Math.abs(diffX) > 50) {
        if (diffX > 0 && playerLane < 2) {
            playerLane++;
        } else if (diffX < 0 && playerLane > 0) {
            playerLane--;
        }
        touchStartX = touchX;
    }
    
    // 上下スワイプでジャンプ/しゃがみ
    if (Math.abs(diffY) > 50) {
        if (diffY < 0 && !isJumping) {
            // 上スワイプでジャンプ
            isJumping = true;
            jumpPosition = 0;
            jumpDirection = 1;
        } else if (diffY > 0 && !isJumping) {
            // 下スワイプでしゃがみ
            isCrouching = true;
        }
        touchStartY = touchY;
    }
}

// ゲーム開始
function startGame() {
    homeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameState.isPlaying = true;
    gameState.isPaused = false;
    resetGame();
}

// ゲーム一時停止/再開
function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    pauseButton.textContent = gameState.isPaused ? '再開' : '一時停止';
}

// ゲーム再開
function restartGame() {
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameState.isPlaying = true;
    gameState.isPaused = false;
    resetGame();
}

// ホーム画面に戻る
function goToHome() {
    gameOverScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    resetGame();
}

// 難易度変更
function changeDifficulty() {
    gameState.difficulty = (gameState.difficulty % 10) + 1;
    difficultyLevel.textContent = gameState.difficultyLevels[gameState.difficulty - 1];
}

// ゲーム初期化
window.addEventListener('load', initGame); 