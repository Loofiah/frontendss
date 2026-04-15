const player = document.getElementById('player');
const gameArea = document.getElementById('game-area');
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreContainer = document.getElementById('score-container');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreElement = document.getElementById('final-score');
const gameContainer = document.getElementById('game-container');

// 游戏参数配置 (方便修改)
const GAME_CONFIG = {
    gravity: 0.7,         // 重力，影响下落速度
    jumpStrength: 13,     // 跳跃力度
    obstacleSpeed: 6,     // 障碍物移动速度
    minSpawnTime: 1000,   // 障碍物生成的最小间隔(毫秒)
    maxSpawnTime: 2200,   // 障碍物生成的最大间隔(毫秒)
    scorePerJump: 10,     // 每次成功跨越获得的分数
    obstacleColors: ['#F44336', '#FFEB3B', '#2196F3'] // 障碍物的随机配色：红、黄、蓝
};

// 游戏状态
let isPlaying = false;
let isJumping = false;
let playerBottom = 20; // 初始Y坐标 (对应CSS中的bottom: 20px)
let velocityY = 0;
let score = 0;
let obstacles = [];
let obstacleTimerId;
let gameLoopId;

// 绑定事件
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
document.addEventListener('keydown', handleKeyDown);

function handleKeyDown(e) {
    // 监听空格键或方向键上
    if ((e.code === 'Space' || e.code === 'ArrowUp') && isPlaying) {
        // 防止默认的网页滚动
        e.preventDefault();
        jump();
    }
}

function jump() {
    // 只有在地面上才可以跳跃
    if (!isJumping) {
        isJumping = true;
        velocityY = GAME_CONFIG.jumpStrength;
    }
}

function startGame() {
    // 隐藏/显示 UI
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    scoreContainer.classList.remove('hidden');
    
    // 初始化状态
    isPlaying = true;
    score = 0;
    updateScoreDisplay();
    playerBottom = 20;
    velocityY = 0;
    isJumping = false;
    player.style.bottom = playerBottom + 'px';
    
    // 清理旧的障碍物
    obstacles.forEach(obs => obs.element.remove());
    obstacles = [];
    if (obstacleTimerId) clearTimeout(obstacleTimerId);
    
    // 清理可能的旧分数弹窗
    document.querySelectorAll('.score-popup').forEach(el => el.remove());

    // 启动游戏循环
    generateObstacle();
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    isPlaying = false;
    clearTimeout(obstacleTimerId);
    cancelAnimationFrame(gameLoopId);
    
    finalScoreElement.innerText = score;
    gameOverScreen.classList.remove('hidden');
    scoreContainer.classList.add('hidden');
}

function gameLoop() {
    if (!isPlaying) return;
    
    updatePlayer();
    updateObstacles();
    
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    gameLoopId = requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    if (isJumping) {
        velocityY -= GAME_CONFIG.gravity;
        playerBottom += velocityY;
        
        // 落地检测
        if (playerBottom <= 20) {
            playerBottom = 20;
            isJumping = false;
            velocityY = 0;
        }
        player.style.bottom = playerBottom + 'px';
    }
}

function generateObstacle() {
    if (!isPlaying) return;
    
    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    
    // 随机选取颜色
    const colorIndex = Math.floor(Math.random() * GAME_CONFIG.obstacleColors.length);
    const selectedColor = GAME_CONFIG.obstacleColors[colorIndex];
    obstacle.style.backgroundColor = selectedColor;

    // 障碍物的数据结构
    let obsData = {
        element: obstacle,
        x: 800,           // 初始X坐标，从屏幕右侧出现
        passed: false,    // 是否已经被玩家跨越
        color: selectedColor // 记录颜色传递给得分特效
    };
    
    gameArea.appendChild(obstacle);
    obstacle.style.left = obsData.x + 'px';
    
    obstacles.push(obsData);
    
    // 随机下一次生成的时间
    let randomTime = Math.random() * (GAME_CONFIG.maxSpawnTime - GAME_CONFIG.minSpawnTime) + GAME_CONFIG.minSpawnTime;
    obstacleTimerId = setTimeout(generateObstacle, randomTime);
}

function updateObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= GAME_CONFIG.obstacleSpeed;
        obs.element.style.left = obs.x + 'px';
        
        // 动态计分：当障碍物移动到玩家左侧时（玩家固定在left:50px, 宽度50px）
        // 设定为 30px 确保玩家已经跨过了它
        if (obs.x < 30 && !obs.passed) {
            obs.passed = true;
            addScore(GAME_CONFIG.scorePerJump, obs.x, 20, obs.color); 
        }
    }
    
    // 移除屏幕左侧之外的障碍物，释放内存
    if (obstacles.length > 0 && obstacles[0].x < -50) {
        obstacles[0].element.remove();
        obstacles.shift();
    }
}

function checkCollision() {
    const playerRect = player.getBoundingClientRect();
    
    for (let i = 0; i < obstacles.length; i++) {
        const obsRect = obstacles[i].element.getBoundingClientRect();
        
        // 包围盒碰撞检测 (加入了容差修正，让游戏手感不那么苛刻)
        if (
            playerRect.right - 15 > obsRect.left &&
            playerRect.left + 15 < obsRect.right &&
            playerRect.bottom > obsRect.top + 5
        ) {
            return true;
        }
    }
    return false;
}

function addScore(points, xPos, yPos, color) {
    score += points;
    updateScoreDisplay(); // 更新右上方的基础灰色得分显示
    
    // 动态分数弹窗效果
    const popup = document.createElement('div');
    popup.classList.add('score-popup');
    popup.innerText = '+' + points;
    popup.style.color = color; // 根据越过障碍物变换特效颜色
    
    // 设置弹窗起始位置 (在跨越的障碍物上方)
    popup.style.left = (xPos + 20) + 'px';
    popup.style.bottom = (yPos + 80) + 'px';
    
    gameContainer.appendChild(popup);
    
    // 动画结束后移除DOM节点
    setTimeout(() => {
        popup.remove();
    }, 1000); // 对应CSS中的1秒动画
}

function updateScoreDisplay() {
    scoreElement.innerText = score;
}
