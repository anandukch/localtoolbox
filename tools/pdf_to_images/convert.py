#!/usr/bin/env python3
"""
PDF to Images Converter
Converts PDF pages to JPG or PNG images using pdf2image (poppler)
"""

import sys
import json
import os
from pathlib import Path

try:
    from pdf2image import convert_from_path
    from PIL import Image
except ImportError as e:
    print(json.dumps({
        "success": False,
        "message": f"Missing dependency: {str(e)}. Please install pdf2image and Pillow."
    }))
    sys.exit(1)


def convert_pdf_to_images(pdf_path, output_dir, format='PNG', dpi=200, page_range=None):
    """
    Convert PDF pages to images
    
    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save images
        format: Output format (PNG or JPEG)
        dpi: Resolution in DPI (default 200)
        page_range: Tuple of (first_page, last_page) or None for all pages
    
    Returns:
        dict: Result with success status and list of created files
    """
    try:
        # Validate inputs
        if not os.path.exists(pdf_path):
            return {
                "success": False,
                "message": f"PDF file not found: {pdf_path}"
            }
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Get PDF filename without extension
        pdf_name = Path(pdf_path).stem
        
        # Convert PDF to images
        first_page = page_range[0] if page_range else None
        last_page = page_range[1] if page_range else None
        
        images = convert_from_path(
            pdf_path,
            dpi=dpi,
            first_page=first_page,
            last_page=last_page,
            fmt=format.lower()
        )
        
        # Save images
        output_files = []
        total_pages = len(images)
        
        for i, image in enumerate(images, start=first_page or 1):
            # Determine file extension
            ext = 'jpg' if format.upper() == 'JPEG' else 'png'
            
            # Create output filename
            output_filename = f"{pdf_name}_page_{i:03d}.{ext}"
            output_path = os.path.join(output_dir, output_filename)
            
            # Save image
            if format.upper() == 'JPEG':
                # Convert RGBA to RGB for JPEG
                if image.mode == 'RGBA':
                    rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                    rgb_image.paste(image, mask=image.split()[3])
                    rgb_image.save(output_path, 'JPEG', quality=95, optimize=True)
                else:
                    image.save(output_path, 'JPEG', quality=95, optimize=True)
            else:
                image.save(output_path, 'PNG', optimize=True)
            
            output_files.append({
                "filename": output_filename,
                "path": output_path,
                "page": i,
                "size": os.path.getsize(output_path)
            })
        
        return {
            "success": True,
            "message": f"Successfully converted {total_pages} page(s) to {format}",
            "output_dir": output_dir,
            "files": output_files,
            "total_pages": total_pages
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Error converting PDF: {str(e)}"
        }


def get_pdf_info(pdf_path):
    """
    Get information about a PDF file
    
    Args:
        pdf_path: Path to the PDF file
    
    Returns:
        dict: PDF information including page count
    """
    try:
        if not os.path.exists(pdf_path):
            return {
                "success": False,
                "message": f"PDF file not found: {pdf_path}"
            }
        
        # Get page count by converting just the first page
        images = convert_from_path(pdf_path, dpi=72, last_page=1)
        
        # Get total page count from pdfinfo
        from pdf2image.pdf2image import pdfinfo_from_path
        info = pdfinfo_from_path(pdf_path)
        
        return {
            "success": True,
            "filename": os.path.basename(pdf_path),
            "page_count": info.get("Pages", 0),
            "file_size": os.path.getsize(pdf_path)
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Error reading PDF info: {str(e)}"
        }


def main():
    """Main function to handle JSON input/output"""
    try:
        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())
        
        action = input_data.get('action', 'convert')
        
        if action == 'info':
            # Get PDF information
            pdf_path = input_data.get('pdf_path')
            result = get_pdf_info(pdf_path)
            
        elif action == 'convert':
            # Convert PDF to images
            pdf_path = input_data.get('pdf_path')
            output_dir = input_data.get('output_dir')
            format = input_data.get('format', 'PNG').upper()
            dpi = int(input_data.get('dpi', 200))
            
            # Parse page range if provided
            page_range = None
            if 'first_page' in input_data or 'last_page' in input_data:
                first_page = input_data.get('first_page')
                last_page = input_data.get('last_page')
                page_range = (first_page, last_page)
            
            result = convert_pdf_to_images(
                pdf_path=pdf_path,
                output_dir=output_dir,
                format=format,
                dpi=dpi,
                page_range=page_range
            )
        else:
            result = {
                "success": False,
                "message": f"Unknown action: {action}"
            }
        
        # Output result as JSON
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "message": f"Invalid JSON input: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": f"Unexpected error: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
