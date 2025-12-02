#!/usr/bin/env python3
"""
Image Compressor Tool

This tool compresses images to reduce file size while maintaining quality.
Uses Pillow (PIL) for image processing.

Input JSON format:
{
  "input": "/path/to/input.jpg",
  "output": "/path/to/output.jpg",
  "quality": 85,
  "max_width": 1920,
  "max_height": 1080
}

Output JSON format:
{
  "success": true,
  "message": "Image compressed successfully",
  "output_path": "/path/to/output.jpg",
  "original_size": 1234567,
  "compressed_size": 567890,
  "compression_ratio": 0.46
}
"""

import json
import sys
import os
from pathlib import Path

def main():
    try:
        # Read JSON input from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            raise ValueError("No input data received")
        
        data = json.loads(input_data)
        
        # Validate required fields
        required_fields = ['input', 'output']
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValueError(f"Missing required field: {field}")
        
        input_path = data['input']
        output_path = data['output']
        quality = data.get('quality', 85)
        max_width = data.get('max_width', 1920)
        max_height = data.get('max_height', 1080)
        
        # Validate input file exists
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        # Try to import PIL
        try:
            from PIL import Image
        except ImportError:
            raise ImportError(
                "Pillow is required but not installed. "
                "Please install it with: pip install Pillow"
            )
        
        # Get original file size
        original_size = os.path.getsize(input_path)
        
        # Open and process the image
        with Image.open(input_path) as img:
            # Convert to RGB if necessary (for JPEG output)
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize if image is larger than max dimensions
            if img.width > max_width or img.height > max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # Save with compression
            img.save(output_path, 'JPEG', quality=quality, optimize=True)
        
        # Get compressed file size
        compressed_size = os.path.getsize(output_path)
        compression_ratio = compressed_size / original_size if original_size > 0 else 0
        
        # Return success response
        result = {
            "success": True,
            "message": "Image compressed successfully",
            "output_path": output_path,
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": round(compression_ratio, 2)
        }
        
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        error_result = {
            "success": False,
            "message": f"Invalid JSON input: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            "success": False,
            "message": f"Error compressing image: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
