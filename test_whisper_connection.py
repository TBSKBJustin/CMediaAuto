#!/usr/bin/env python3
"""
测试CMAS与whisper.cpp的连接
"""
import os
import sys
import subprocess
from pathlib import Path
import yaml

def print_section(title):
    """打印分节标题"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def check_whisper_binary():
    """检查whisper.cpp二进制文件"""
    print_section("1. 检查 whisper.cpp 二进制文件")
    
    # 从配置文件读取路径
    config_path = "config/config.yaml"
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        whisper_bin = config['modules']['subtitles']['whispercpp']['custom_path']
        print(f"配置文件中的路径: {whisper_bin}")
    else:
        whisper_bin = "/Users/justin/Desktop/Justin/school/whisper.cpp/build/bin/whisper-cli"
        print(f"使用默认路径: {whisper_bin}")
    
    if os.path.exists(whisper_bin):
        print(f"✓ 二进制文件存在: {whisper_bin}")
        
        # 测试运行
        try:
            result = subprocess.run(
                [whisper_bin, '--help'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print("✓ whisper-cli 可以正常运行")
                return True, whisper_bin
            else:
                print(f"✗ whisper-cli 运行失败 (返回码: {result.returncode})")
                return False, whisper_bin
        except Exception as e:
            print(f"✗ 运行测试失败: {e}")
            return False, whisper_bin
    else:
        print(f"✗ 二进制文件不存在: {whisper_bin}")
        return False, whisper_bin

def check_whisper_models():
    """检查whisper模型文件"""
    print_section("2. 检查 Whisper 模型文件")
    
    # CMAS配置中的模型路径
    config_path = "config/config.yaml"
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        model_path = config['modules']['subtitles']['whispercpp']['model_path']
        print(f"CMAS配置的模型路径: {model_path}")
    else:
        model_path = "models/ggml-base.bin"
        print(f"使用默认模型路径: {model_path}")
    
    # 检查CMAS目录下是否有模型
    if os.path.exists(model_path):
        print(f"✓ CMAS模型文件存在: {model_path}")
        return True, model_path
    else:
        print(f"✗ CMAS模型文件不存在: {model_path}")
        
        # 检查whisper.cpp目录下的测试模型
        whisper_test_model = "/Users/justin/Desktop/Justin/school/whisper.cpp/models/for-tests-ggml-base.bin"
        if os.path.exists(whisper_test_model):
            print(f"  但是找到whisper.cpp测试模型: {whisper_test_model}")
            print(f"  建议: 创建models目录并复制或链接该模型")
            return False, whisper_test_model
        return False, None

def test_engine_initialization():
    """测试引擎初始化"""
    print_section("3. 测试 WhisperCppEngine 初始化")
    
    try:
        # 添加modules到路径
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from modules.subtitles.engine_whispercpp import WhisperCppEngine
        
        engine = WhisperCppEngine(
            model="base",
            models_dir="models",
            config_path="config/config.yaml"
        )
        
        print(f"Whisper 二进制: {engine.whisper_bin}")
        print(f"模型路径: {engine.model_path}")
        print(f"引擎可用: {engine.available}")
        
        if engine.available:
            print("✓ WhisperCppEngine 初始化成功")
            return True
        else:
            print("✗ WhisperCppEngine 初始化失败 - 二进制不可用")
            return False
            
    except Exception as e:
        print(f"✗ 初始化失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def provide_recommendations(binary_ok, model_ok, engine_ok):
    """提供修复建议"""
    print_section("修复建议")
    
    if binary_ok and model_ok and engine_ok:
        print("✓ 所有检查通过！CMAS可以正常使用whisper.cpp")
        return
    
    print("需要修复以下问题：\n")
    
    if not binary_ok:
        print("1. whisper.cpp 二进制文件问题")
        print("   修复方法:")
        print("   cd /Users/justin/Desktop/Justin/school/whisper.cpp")
        print("   cmake -B build")
        print("   cmake --build build -j --config Release")
        print()
    
    if not model_ok:
        print("2. 模型文件缺失")
        print("   修复方法:")
        print("   mkdir -p /Users/justin/Desktop/Justin/school/CMAS/models")
        print("   cd /Users/justin/Desktop/Justin/school/whisper.cpp")
        print("   # 下载模型")
        print("   bash ./models/download-ggml-model.sh base")
        print("   # 或复制测试模型")
        print("   cp models/for-tests-ggml-base.bin /Users/justin/Desktop/Justin/school/CMAS/models/ggml-base.bin")
        print()
    
    if not engine_ok and binary_ok:
        print("3. 引擎初始化问题")
        print("   检查config/config.yaml中的配置是否正确")
        print()

def main():
    """主函数"""
    print("CMAS与whisper.cpp连接测试")
    print("="*60)
    
    # 切换到CMAS目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    print(f"工作目录: {os.getcwd()}")
    
    # 执行检查
    binary_ok, whisper_bin = check_whisper_binary()
    model_ok, model_path = check_whisper_models()
    engine_ok = test_engine_initialization()
    
    # 提供建议
    provide_recommendations(binary_ok, model_ok, engine_ok)
    
    # 总结
    print_section("总结")
    status = "✓ 通过" if (binary_ok and model_ok and engine_ok) else "✗ 失败"
    print(f"连接测试: {status}")
    
    return 0 if (binary_ok and model_ok and engine_ok) else 1

if __name__ == '__main__':
    sys.exit(main())
