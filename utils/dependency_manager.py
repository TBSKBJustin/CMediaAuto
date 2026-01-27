"""
Dependency Manager - Check and install system dependencies
"""

import os
import sys
import platform
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class DependencyManager:
    """Manages system dependencies for the Church Media Automation System"""
    
    DEPENDENCIES = {
        'ffmpeg': {
            'name': 'FFmpeg',
            'description': 'Video/audio processing',
            'required': True,
            'check_cmd': ['ffmpeg', '-version'],
            'install': {
                'macos': 'brew install ffmpeg',
                'linux': 'sudo apt-get install ffmpeg',
                'windows': 'Download from https://ffmpeg.org/download.html'
            }
        },
        'whisper.cpp': {
            'name': 'whisper.cpp',
            'description': 'Fast subtitle generation',
            'required': False,
            'check_cmd': ['whisper', '--help'],
            'install': {
                'macos': 'brew install whisper-cpp',
                'linux': 'git clone https://github.com/ggerganov/whisper.cpp && cd whisper.cpp && make',
                'windows': 'See https://github.com/ggerganov/whisper.cpp for instructions'
            },
            'models_url': 'https://huggingface.co/ggerganov/whisper.cpp'
        },
        'ollama': {
            'name': 'Ollama',
            'description': 'Local AI model runner (for character generation)',
            'required': False,
            'check_cmd': ['ollama', '--version'],
            'install': {
                'macos': 'brew install ollama',
                'linux': 'curl -fsSL https://ollama.com/install.sh | sh',
                'windows': 'Download from https://ollama.com/download'
            },
            'post_install': 'ollama pull llama2'
        },
        'obs': {
            'name': 'OBS Studio',
            'description': 'Recording/streaming software (optional)',
            'required': False,
            'check_cmd': None,  # OBS doesn't have a CLI check
            'check_path': {
                'macos': '/Applications/OBS.app',
                'linux': '/usr/bin/obs',
                'windows': r'C:\Program Files\obs-studio\bin\64bit\obs64.exe'
            },
            'install': {
                'macos': 'brew install --cask obs',
                'linux': 'sudo apt-get install obs-studio',
                'windows': 'Download from https://obsproject.com/download'
            }
        }
    }
    
    def __init__(self):
        self.logger = self._setup_logger()
        self.os_type = self._detect_os()
    
    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("DependencyManager")
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(levelname)s: %(message)s')
        handler.setFormatter(formatter)
        if not logger.handlers:
            logger.addHandler(handler)
        return logger
    
    def _detect_os(self) -> str:
        """Detect operating system"""
        system = platform.system().lower()
        if system == 'darwin':
            return 'macos'
        elif system == 'linux':
            return 'linux'
        elif system == 'windows':
            return 'windows'
        return 'unknown'
    
    def _load_custom_paths(self) -> Dict[str, str]:
        """Load custom paths from config file"""
        import yaml
        
        custom_paths = {}
        config_path = Path('config/config.yaml')
        
        try:
            if not config_path.exists():
                return custom_paths
            
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
            
            # Load whisper.cpp custom path
            whispercpp_config = config.get('modules', {}).get('subtitles', {}).get('whispercpp', {})
            whisper_path = whispercpp_config.get('custom_path') or whispercpp_config.get('whisper_bin')
            if whisper_path and os.path.exists(whisper_path):
                custom_paths['whisper.cpp'] = whisper_path
            
            # Add more dependency custom paths here as needed
            
        except Exception as e:
            logging.warning(f"Failed to load custom paths from config: {e}")
        
        return custom_paths
    
    def check_dependency(self, dep_key: str, custom_path: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """
        Check if a dependency is installed
        
        Args:
            dep_key: Dependency key
            custom_path: Optional custom path to check first
        
        Returns:
            (is_installed, version_or_path)
        """
        dep = self.DEPENDENCIES.get(dep_key)
        if not dep:
            return False, None
        
        # Check custom path first
        if custom_path and os.path.exists(custom_path):
            try:
                result = subprocess.run(
                    [custom_path, '--help'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    return True, f"Custom: {custom_path}"
            except (FileNotFoundError, subprocess.TimeoutExpired):
                pass
        
        # Check via command
        if dep.get('check_cmd'):
            try:
                result = subprocess.run(
                    dep['check_cmd'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    # Extract version from output if possible
                    version = result.stdout.split('\n')[0] if result.stdout else 'installed'
                    return True, version
            except (FileNotFoundError, subprocess.TimeoutExpired):
                pass
        
        # Check via path (for OBS)
        if dep.get('check_path'):
            path = dep['check_path'].get(self.os_type)
            if path and os.path.exists(path):
                return True, path
        
        return False, None
    
    def check_all(self) -> Dict[str, Dict]:
        """Check all dependencies"""
        results = {}
        
        # Load custom paths from config
        custom_paths = self._load_custom_paths()
        
        for dep_key, dep_info in self.DEPENDENCIES.items():
            custom_path = custom_paths.get(dep_key)
            is_installed, version = self.check_dependency(dep_key, custom_path)
            results[dep_key] = {
                'name': dep_info['name'],
                'description': dep_info['description'],
                'required': dep_info['required'],
                'installed': is_installed,
                'version': version
            }
        
        return results
    
    def get_install_command(self, dep_key: str) -> Optional[str]:
        """Get installation command for current OS"""
        dep = self.DEPENDENCIES.get(dep_key)
        if not dep:
            return None
        
        return dep['install'].get(self.os_type)
    
    def install_dependency(self, dep_key: str, auto_confirm: bool = False) -> bool:
        """
        Install a dependency
        
        Args:
            dep_key: Dependency key
            auto_confirm: Skip confirmation prompt
            
        Returns:
            Success status
        """
        dep = self.DEPENDENCIES.get(dep_key)
        if not dep:
            self.logger.error(f"Unknown dependency: {dep_key}")
            return False
        
        # Check if already installed
        is_installed, _ = self.check_dependency(dep_key)
        if is_installed:
            self.logger.info(f"{dep['name']} is already installed")
            return True
        
        # Get install command
        install_cmd = self.get_install_command(dep_key)
        if not install_cmd:
            self.logger.error(f"No installation method for {dep['name']} on {self.os_type}")
            return False
        
        # Confirm installation
        if not auto_confirm:
            print(f"\n{dep['name']}: {dep['description']}")
            print(f"Install command: {install_cmd}")
            response = input("Install? (y/n): ").lower().strip()
            if response != 'y':
                self.logger.info("Installation cancelled")
                return False
        
        # Execute installation
        try:
            self.logger.info(f"Installing {dep['name']}...")
            
            # Handle different installation methods
            if install_cmd.startswith('brew'):
                result = subprocess.run(install_cmd.split(), check=True)
            elif install_cmd.startswith('sudo'):
                # For sudo commands, we need to run with shell
                result = subprocess.run(install_cmd, shell=True, check=True)
            elif install_cmd.startswith('curl') or install_cmd.startswith('git'):
                result = subprocess.run(install_cmd, shell=True, check=True)
            else:
                # For other commands, provide manual instructions
                print(f"\nPlease run: {install_cmd}")
                return False
            
            # Post-installation steps
            if dep.get('post_install'):
                self.logger.info("Running post-installation steps...")
                subprocess.run(dep['post_install'], shell=True)
            
            # Verify installation
            is_installed, version = self.check_dependency(dep_key)
            if is_installed:
                self.logger.info(f"✓ {dep['name']} installed successfully")
                return True
            else:
                self.logger.warning(f"Installation completed but {dep['name']} not detected")
                return False
        
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Installation failed: {e}")
            return False
    
    def interactive_setup(self):
        """Interactive setup wizard"""
        print("\n" + "="*60)
        print("Church Media Automation System - Dependency Setup")
        print("="*60 + "\n")
        
        results = self.check_all()
        
        # Show status
        print("Dependency Status:\n")
        for dep_key, info in results.items():
            status = "✓ Installed" if info['installed'] else "✗ Not installed"
            required = " (REQUIRED)" if info['required'] else " (optional)"
            print(f"{status:20} {info['name']:20} {info['description']}{required}")
            if info['installed'] and info['version']:
                print(f"{'':20} → {info['version'][:60]}")
        
        print("\n" + "-"*60 + "\n")
        
        # Install missing dependencies
        missing_required = [k for k, v in results.items() if v['required'] and not v['installed']]
        missing_optional = [k for k, v in results.items() if not v['required'] and not v['installed']]
        
        if missing_required:
            print("⚠ Required dependencies are missing!\n")
            for dep_key in missing_required:
                self.install_dependency(dep_key, auto_confirm=False)
        
        if missing_optional:
            print("\nOptional dependencies:\n")
            for dep_key in missing_optional:
                dep = self.DEPENDENCIES[dep_key]
                print(f"\n{dep['name']}: {dep['description']}")
                response = input("Install? (y/n/p for provide path): ").lower().strip()
                if response == 'y':
                    self.install_dependency(dep_key, auto_confirm=True)
                elif response == 'p':
                    self._configure_custom_path(dep_key)
        
        # Download whisper models if whisper.cpp is installed
        if results['whisper.cpp']['installed']:
            self._setup_whisper_models()
        
        print("\n" + "="*60)
        print("Setup complete!")
        print("="*60 + "\n")
    
    def _setup_whisper_models(self):
        """Download whisper.cpp models"""
        print("\n" + "-"*60)
        print("Whisper.cpp Models Setup")
        print("-"*60 + "\n")
        
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)
        
        available_models = ['tiny', 'base', 'small', 'medium', 'large']
        print("Available models (larger = more accurate, slower):")
        for i, model in enumerate(available_models, 1):
            print(f"  {i}. {model}")
        
        response = input("\nDownload model? (1-5 or 'n' to skip): ").strip()
        
        if response.isdigit() and 1 <= int(response) <= 5:
            model_name = available_models[int(response) - 1]
            model_file = f"ggml-{model_name}.bin"
            model_path = models_dir / model_file
            
            if model_path.exists():
                print(f"Model {model_name} already downloaded")
            else:
                print(f"Downloading {model_name} model...")
                download_url = f"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{model_file}"
                
                try:
                    import urllib.request
                    urllib.request.urlretrieve(download_url, model_path)
                    print(f"✓ Downloaded {model_file}")
                except Exception as e:
                    print(f"✗ Download failed: {e}")
                    print(f"Please download manually from: {download_url}")
    
    def _configure_custom_path(self, dep_key: str):
        """Configure custom path for a dependency"""
        import yaml
        
        dep = self.DEPENDENCIES.get(dep_key)
        if not dep:
            return
        
        print(f"\n{dep['name']} - Custom Path Configuration")
        print("-" * 60)
        
        if dep_key == 'whisper.cpp':
            print("\nPlease provide the path to whisper.cpp executable.")
            print("Examples:")
            print("  macOS/Linux: /usr/local/bin/whisper")
            print("  macOS/Linux: ~/whisper.cpp/main")
            print("  Windows: C:\\whisper.cpp\\main.exe")
        
        path = input("\nEnter full path to executable: ").strip()
        
        # Validate path
        if not os.path.exists(path):
            print(f"✗ Path does not exist: {path}")
            retry = input("Try again? (y/n): ").lower().strip()
            if retry == 'y':
                return self._configure_custom_path(dep_key)
            return
        
        # Test the executable
        try:
            result = subprocess.run(
                [path, '--help'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode != 0:
                print(f"✗ Executable test failed")
                return
        except Exception as e:
            print(f"✗ Failed to test executable: {e}")
            return
        
        print(f"✓ Path verified: {path}")
        
        # Update config file
        config_path = Path("config/config.yaml")
        if not config_path.exists():
            print("✗ Config file not found")
            return
        
        try:
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f) or {}
            
            if dep_key == 'whisper.cpp':
                if 'modules' not in config:
                    config['modules'] = {}
                if 'subtitles' not in config['modules']:
                    config['modules']['subtitles'] = {}
                if 'whispercpp' not in config['modules']['subtitles']:
                    config['modules']['subtitles']['whispercpp'] = {}
                
                config['modules']['subtitles']['whispercpp']['custom_path'] = path
                config['modules']['subtitles']['whispercpp']['whisper_bin'] = path
            
            with open(config_path, 'w') as f:
                yaml.dump(config, f, default_flow_style=False, sort_keys=False)
            
            print(f"✓ Configuration saved to {config_path}")
            print(f"\nCustom path configured: {path}")
            
        except Exception as e:
            print(f"✗ Failed to update config: {e}")
            print(f"\nPlease manually add to config/config.yaml:")
            if dep_key == 'whisper.cpp':
                print(f"  modules:")
                print(f"    subtitles:")
                print(f"      whispercpp:")
                print(f"        custom_path: \"{path}\"")
                print(f"        whisper_bin: \"{path}\"")


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Dependency Manager')
    parser.add_argument('command', nargs='?', choices=['check', 'install', 'setup'], 
                       default='setup', help='Command to execute')
    parser.add_argument('--dependency', help='Specific dependency to check/install')
    parser.add_argument('--yes', action='store_true', help='Auto-confirm installations')
    
    args = parser.parse_args()
    
    manager = DependencyManager()
    
    if args.command == 'check':
        if args.dependency:
            is_installed, version = manager.check_dependency(args.dependency)
            if is_installed:
                print(f"✓ {args.dependency} is installed: {version}")
            else:
                print(f"✗ {args.dependency} is not installed")
        else:
            results = manager.check_all()
            for dep_key, info in results.items():
                status = "✓" if info['installed'] else "✗"
                print(f"{status} {info['name']:20} {info['description']}")
    
    elif args.command == 'install':
        if not args.dependency:
            print("Error: --dependency required for install command")
            return
        manager.install_dependency(args.dependency, auto_confirm=args.yes)
    
    elif args.command == 'setup':
        manager.interactive_setup()


if __name__ == '__main__':
    main()
