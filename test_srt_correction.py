#!/usr/bin/env python3
"""
Test SRT correction with strict format preservation
"""
import sys
import logging
from pathlib import Path
from modules.content.ai_processor import AIContentProcessor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_test_srt():
    """Create a test SRT file with intentional errors"""
    test_srt = Path("test_output/test_input.srt")
    test_srt.parent.mkdir(exist_ok=True)
    
    content = """1
00:00:00,000 --> 00:00:02,300
李政階妹平安

2
00:00:02,300 --> 00:00:05,900
感謝祝我們來到他的面前

3
00:00:05,900 --> 00:00:11,000
祝祝祝祝祝祝祝祝祝祝祝祝祝祝祝祝祝祝跟大家講這個題目

4
00:00:11,000 --> 00:00:20,000
其實藉術去上禮拜劉祭元牧西的退休日所講的

5
00:00:20,000 --> 00:00:27,000
也有問題問大家這個題目

"""
    
    test_srt.write_text(content, encoding='utf-8')
    logger.info(f"Created test SRT: {test_srt}")
    return str(test_srt)

def main():
    logger.info("=== Testing SRT Correction with Format Preservation ===")
    
    # Create test SRT
    test_srt_path = create_test_srt()
    
    # Initialize processor
    processor = AIContentProcessor(
        model="qwen3:14b",
        host="http://localhost:11434",
        logger=logger
    )
    
    # Check Ollama availability
    logger.info("Checking Ollama availability...")
    if not processor._check_ollama_available():
        logger.error("❌ Ollama is not available at http://localhost:11434")
        logger.info("Please start Ollama: ollama serve")
        return 1
    
    logger.info("✅ Ollama is available")
    
    # Check model
    if not processor._check_model_available():
        logger.warning(f"⚠️  Model {processor.model} not found")
        logger.info(f"Please pull the model: ollama pull {processor.model}")
        return 1
    
    logger.info(f"✅ Model {processor.model} is available")
    
    # Run correction
    logger.info("\n--- Running SRT Correction ---")
    success, error, output_files = processor.correct_subtitles(
        srt_path=test_srt_path,
        output_dir="test_output",
        batch_size=10  # Not used in new implementation
    )
    
    if not success:
        logger.error(f"❌ Correction failed: {error}")
        return 1
    
    logger.info("✅ Correction completed")
    
    # Display results
    if "corrected_srt" in output_files:
        corrected_path = output_files["corrected_srt"]
        logger.info(f"\n--- Corrected SRT: {corrected_path} ---")
        
        corrected_content = Path(corrected_path).read_text(encoding='utf-8')
        print("\n" + "="*60)
        print(corrected_content)
        print("="*60 + "\n")
        
        # Verify structure preservation
        logger.info("--- Verification ---")
        original_lines = Path(test_srt_path).read_text(encoding='utf-8').strip().split('\n')
        corrected_lines = corrected_content.strip().split('\n')
        
        # Check line count
        logger.info(f"Original lines: {len(original_lines)}")
        logger.info(f"Corrected lines: {len(corrected_lines)}")
        
        # Parse both to check block count
        original_blocks = processor._parse_srt(test_srt_path)
        corrected_blocks = processor._parse_srt_from_text(corrected_content)
        
        logger.info(f"Original blocks: {len(original_blocks)}")
        logger.info(f"Corrected blocks: {len(corrected_blocks)}")
        
        if len(original_blocks) == len(corrected_blocks):
            logger.info("✅ Block count preserved")
        else:
            logger.error("❌ Block count mismatch!")
        
        # Check timestamps
        timestamps_match = all(
            o['timestamp'] == c['timestamp']
            for o, c in zip(original_blocks, corrected_blocks)
        )
        
        if timestamps_match:
            logger.info("✅ All timestamps preserved")
        else:
            logger.error("❌ Some timestamps changed!")
    
    logger.info("\n=== Test Complete ===")
    return 0

if __name__ == "__main__":
    sys.exit(main())
