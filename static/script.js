document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const closeBtn = document.getElementById('closeBtn');
    const trackerCube = document.getElementById('tracker-cube');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    let updateInterval;
    let isTracking = false;
    let connectionCheckInterval;
    let lastDataTime = Date.now();
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;
    const RECONNECT_INTERVAL = 2000; // 2秒
    const CONNECTION_TIMEOUT = 1000; // 1秒

    // 更新连接状态
    function updateConnectionStatus(status, message) {
        statusIndicator.className = 'status-indicator ' + status;
        statusText.textContent = message;
    }

    // 检查连接状态
    function checkConnection() {
        const timeSinceLastData = Date.now() - lastDataTime;
        if (timeSinceLastData > CONNECTION_TIMEOUT) {
            if (isTracking) {
                handleDisconnection();
            }
        }
    }

    // 处理断开连接
    async function handleDisconnection() {
        try {
            const response = await fetch('/get_data');
            const data = await response.json();
            
            if (response.ok) {
                // 如果服务器响应正常，但数据全为0，说明是在等待追踪器数据
                const hasValidData = Object.values(data.position).some(v => v !== 0) || 
                                   Object.values(data.rotation).some(v => v !== 0);
                if (!hasValidData) {
                    updateConnectionStatus('waiting', '等待追踪器数据...');
                    return;
                }
            }
        } catch (error) {
            // 如果无法连接到服务器，才认为是断开连接
            updateConnectionStatus('disconnected', '连接已断开，尝试重新连接...');
            clearInterval(updateInterval);
            
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                setTimeout(handleDisconnection, RECONNECT_INTERVAL);
            } else {
                updateConnectionStatus('disconnected', '连接失败，请检查设备状态');
                isTracking = false;
                updateButtonState(false);
            }
        }
    }

    // 更新按钮状态
    function updateButtonState(tracking) {
        startBtn.style.display = tracking ? 'none' : 'block';
        stopBtn.style.display = tracking ? 'block' : 'none';
    }

    // 重置显示数据
    function resetDisplay() {
        const defaultData = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 0 }
        };
        updateDisplay(defaultData);
    }

    // 更新数据显示
    function updateDisplay(data) {
        if (!data) return;

        lastDataTime = Date.now();
        
        // 更新位置数据
        document.getElementById('posX').textContent = data.position.x.toFixed(4);
        document.getElementById('posY').textContent = data.position.y.toFixed(4);
        document.getElementById('posZ').textContent = data.position.z.toFixed(4);

        // 更新旋转数据
        document.getElementById('rotRoll').textContent = data.rotation.roll.toFixed(4);
        document.getElementById('rotPitch').textContent = data.rotation.pitch.toFixed(4);
        document.getElementById('rotYaw').textContent = data.rotation.yaw.toFixed(4);

        // 检查是否有有效的追踪器数据
        const hasValidData = Math.abs(data.position.x) > 0.0001 || 
                           Math.abs(data.position.y) > 0.0001 || 
                           Math.abs(data.position.z) > 0.0001 || 
                           Math.abs(data.rotation.roll) > 0.0001 || 
                           Math.abs(data.rotation.pitch) > 0.0001 || 
                           Math.abs(data.rotation.yaw) > 0.0001;

        // 更新状态显示
        if (isTracking) {
            if (!hasValidData) {
                updateConnectionStatus('waiting', '等待追踪器数据...');
            } else {
                updateConnectionStatus('connected', '已连接');
            }
        }

        // 使用 requestAnimationFrame 更新立方体旋转
        if (hasValidData) {
            requestAnimationFrame(() => {
                trackerCube.style.transform = `rotateX(${data.rotation.pitch}deg) rotateY(${data.rotation.yaw}deg) rotateZ(${data.rotation.roll}deg)`;
            });
        }
    }

    // 开始追踪
    async function startTracking() {
        try {
            updateConnectionStatus('connecting', '正在连接...');
            const response = await fetch('/start_tracking');
            const data = await response.json();
            
            if (data.status === 'success') {
                isTracking = true;
                updateButtonState(true);
                updateConnectionStatus('waiting', '等待追踪器数据...');
                reconnectAttempts = 0;
                
                // 开始定期更新数据
                updateInterval = setInterval(async () => {
                    if (!isTracking) {
                        clearInterval(updateInterval);
                        return;
                    }
                    
                    try {
                        const dataResponse = await fetch('/get_data');
                        const trackerData = await dataResponse.json();
                        if (trackerData && isTracking) {
                            updateDisplay(trackerData);
                        }
                    } catch (error) {
                        console.error('获取数据时出错:', error);
                    }
                }, 16); // 约60Hz的更新率
            }
        } catch (error) {
            console.error('启动追踪时出错:', error);
            updateConnectionStatus('disconnected', '连接失败');
            isTracking = false;
            updateButtonState(false);
        }
    }

    // 停止追踪
    async function stopTracking() {
        try {
            const response = await fetch('/stop_tracking');
            const data = await response.json();
            
            if (data.status === 'success') {
                isTracking = false;
                updateButtonState(false);
                clearInterval(updateInterval);
                updateConnectionStatus('disconnected', '已停止追踪');
                resetDisplay();
            }
        } catch (error) {
            console.error('停止追踪时出错:', error);
            updateConnectionStatus('disconnected', '停止追踪失败');
        }
    }

    // 关闭服务器并退出
    async function shutdownServer() {
        if (isTracking) {
            await stopTracking();
        }

        try {
            updateConnectionStatus('disconnected', '正在关闭服务...');
            const response = await fetch('/shutdown');
            const data = await response.json();
            
            if (data.status === 'success') {
                clearInterval(connectionCheckInterval);
                // 等待一小段时间确保服务器有时间关闭
                setTimeout(() => {
                    // 关闭当前窗口
                    window.close();
                    // 如果window.close()不起作用（某些浏览器可能阻止），显示提示消息
                    setTimeout(() => {
                        alert('服务器已关闭。您现在可以安全地关闭此窗口。');
                    }, 500);
                }, 1000);
            }
        } catch (error) {
            console.error('关闭服务器时出错:', error);
            alert('关闭服务器时出错。请手动关闭窗口。');
        }
    }

    // 事件监听器
    startBtn.addEventListener('click', startTracking);
    stopBtn.addEventListener('click', stopTracking);
    closeBtn.addEventListener('click', shutdownServer);

    // 初始化
    updateButtonState(false);
    updateConnectionStatus('connecting', '等待连接...');
    
    // 启动连接状态检查
    connectionCheckInterval = setInterval(checkConnection, 500);
}); 