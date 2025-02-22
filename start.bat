@echo off
echo 正在启动 VR 追踪器可视化工具...
python -m pip install flask
start http://localhost:5000
python app.py 