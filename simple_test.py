import triad_openvr as vr
import time
import openvr

try:
    # 检查 OpenVR 运行时版本
    print("检查 OpenVR 状态...")
    
    if openvr.isRuntimeInstalled():
        print("OpenVR 运行时已安装")
    else:
        print("OpenVR 运行时未安装")
        
    if openvr.isHmdPresent():
        print("检测到 VR 头显")
    else:
        print("未检测到 VR 头显")

    # 初始化 OpenVR
    print("\n尝试初始化 OpenVR...")
    openvr.init(openvr.VRApplication_Other)
    print("OpenVR 初始化成功")
    
    # 初始化 triad_openvr
    print("\n尝试初始化 triad_openvr...")
    v = vr.triad_openvr()
    print("triad_openvr 初始化成功！")
    
    # 打印发现的设备
    print("\n发现的设备：")
    v.print_discovered_objects()
    
    # 尝试直接访问 OpenVR 设备
    print("\n尝试直接通过 OpenVR 枚举设备：")
    vrsys = openvr.VRSystem()
    for i in range(openvr.k_unMaxTrackedDeviceCount):
        if vrsys.isTrackedDeviceConnected(i):
            device_class = vrsys.getTrackedDeviceClass(i)
            print(f"设备 {i}: 类型 = {device_class}")
            device_serial = vrsys.getStringTrackedDeviceProperty(i, openvr.Prop_SerialNumber_String)
            print(f"   序列号: {device_serial}")
    
    time.sleep(1)
    openvr.shutdown()
    
except Exception as e:
    print(f"\n错误: {e}")
    print("请确保：")
    print("1. SteamVR 已安装并运行")
    print("2. VR 设备已正确连接")
    print("3. config.json 中的设备序列号配置正确") 