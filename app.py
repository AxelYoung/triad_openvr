from flask import Flask, render_template, jsonify
import triad_openvr
import openvr
import threading
import time
import json
import os
import signal

app = Flask(__name__)

# 全局变量用于存储追踪器数据和控制状态
tracker_data = {
    'position': {'x': 0, 'y': 0, 'z': 0},
    'rotation': {'roll': 0, 'pitch': 0, 'yaw': 0},
    'is_running': False
}

# 追踪线程
tracker_thread = None
openvr_system = None

def cleanup_resources():
    """清理所有资源"""
    global tracker_thread, openvr_system
    # 停止追踪
    tracker_data['is_running'] = False
    if tracker_thread:
        tracker_thread.join(timeout=1.0)
        tracker_thread = None
    # 关闭 OpenVR
    if openvr_system:
        openvr.shutdown()
        openvr_system = None

def update_tracker_data():
    global openvr_system
    try:
        openvr_system = openvr.init(openvr.VRApplication_Other)
        v = triad_openvr.triad_openvr()
        
        while tracker_data['is_running']:
            try:
                pose = v.devices["tracker_1"].get_pose_euler()
                if pose:
                    tracker_data['position'] = {
                        'x': round(pose[0], 4),
                        'y': round(pose[1], 4),
                        'z': round(pose[2], 4)
                    }
                    tracker_data['rotation'] = {
                        'roll': round(pose[3], 4),
                        'pitch': round(pose[4], 4),
                        'yaw': round(pose[5], 4)
                    }
                time.sleep(1/120)  # 提高更新率到120Hz
            except Exception as e:
                print(f"更新数据时出错: {e}")
                break
        
        if openvr_system:
            openvr.shutdown()
            openvr_system = None
            
    except Exception as e:
        print(f"初始化 OpenVR 时出错: {e}")
        tracker_data['is_running'] = False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start_tracking')
def start_tracking():
    global tracker_thread
    if not tracker_data['is_running']:
        tracker_data['is_running'] = True
        tracker_thread = threading.Thread(target=update_tracker_data, daemon=True)
        tracker_thread.start()
    return jsonify({'status': 'success'})

@app.route('/stop_tracking')
def stop_tracking():
    global tracker_thread, openvr_system
    tracker_data['is_running'] = False
    if tracker_thread:
        tracker_thread.join(timeout=1.0)
        tracker_thread = None
    if openvr_system:
        openvr.shutdown()
        openvr_system = None
    # 重置数据
    tracker_data.update({
        'position': {'x': 0, 'y': 0, 'z': 0},
        'rotation': {'roll': 0, 'pitch': 0, 'yaw': 0}
    })
    return jsonify({'status': 'success'})

@app.route('/get_data')
def get_data():
    return jsonify(tracker_data)

@app.route('/shutdown')
def shutdown():
    """关闭服务器"""
    cleanup_resources()
    # 获取当前进程ID
    pid = os.getpid()
    # 返回成功状态
    response = jsonify({'status': 'success'})
    # 创建一个线程在短暂延迟后终止服务器
    def delayed_shutdown():
        time.sleep(0.5)  # 等待响应发送
        os.kill(pid, signal.SIGTERM)
    threading.Thread(target=delayed_shutdown, daemon=True).start()
    return response

if __name__ == '__main__':
    try:
        app.run(debug=True, port=5000)
    finally:
        cleanup_resources() 