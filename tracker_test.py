import triad_openvr
import time
import sys
import openvr

try:
    # 初始化 OpenVR
    openvr.init(openvr.VRApplication_Other)
    print("OpenVR 初始化成功")
    
    v = triad_openvr.triad_openvr()
    print("triad_openvr 初始化成功")
    v.print_discovered_objects()

    if len(sys.argv) == 1:
        interval = 1/250
    elif len(sys.argv) == 2:
        interval = 1/float(sys.argv[1])
    else:
        print("参数数量无效")
        interval = False
    
    if interval:
        print("\n开始追踪，按 Ctrl+C 停止...")
        while(True):
            try:
                start = time.time()
                txt = ""
                pose = v.devices["tracker_1"].get_pose_euler()
                if pose:
                    for each in pose:
                        txt += "%.4f" % each
                        txt += " "
                    print("\r" + txt, end="")
                    sleep_time = interval-(time.time()-start)
                    if sleep_time>0:
                        time.sleep(sleep_time)
                else:
                    print("\r等待追踪器数据...", end="")
                    time.sleep(0.1)
            except KeyError:
                print("\n错误：找不到 tracker_1。请检查追踪器是否已连接。")
                break
            except KeyboardInterrupt:
                print("\n用户停止追踪")
                break
            except Exception as e:
                print(f"\n意外错误：{e}")
                break
    
    # 清理
    openvr.shutdown()
    
except ImportError as e:
    print(f"导入模块错误：{e}")
    print("请使用以下命令安装所需包：")
    print("pip install openvr triad_openvr")
except Exception as e:
    print(f"初始化 OpenVR 时出错：{e}")
    print("请确保：")
    print("1. SteamVR 已安装并运行")
    print("2. VR 设备已正确连接")
    print("3. config.json 中的设备序列号配置正确")